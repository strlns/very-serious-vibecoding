/*

	This file is part of LMAO (Low-level Malbolge Assembler, Ooh!), an assembler for Malbolge.
	Copyright (C) 2013-2026 Matthias Lutter

	LMAO is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	LMAO is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program. If not, see <http://www.gnu.org/licenses/>.

	E-Mail: matthias@lutter.cc

*/

#include "malbolge.h"
#include "types.h"
#include "label.h"
#include "xlat.h"
#include "gen_init.h"
#include "initialize.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#include "binary_values.h"
#include "init_beam.h"
unsigned int get_register_a_value_for_crazy(unsigned int,unsigned int,unsigned int);
#include "stage_preload.h"

void update_offsets(MemoryCell memory[]) {
	int i;
	for (i = 0; i <= C2; i++) {
		if (memory[i].usage == CODE || memory[i].usage == PREINITIALIZED_CODE)
			memory[i].code->offset = i;
		if (memory[i].usage == DATA || memory[i].usage == RESERVED_DATA)
			memory[i].data->offset = i;
	}
}

/**
 * Evaluates a leaf DataAtom to its numeric Malbolge address or value.
 *
 * For numeric atoms the stored number is returned directly (with the
 * address-decrement applied for label references, see note in the .DATA
 * section documentation).  Returns -1 on error.
 */
static int parse_dataatom(DataAtom* data, LabelTree* labeltree, int no_error_printing) {
	int value = -1;
	if (data==0)
			return -1; /* ERROR */
	if (data->destination_label == 0)
		/* data is a constant integer number. */
		value = data->number;
	else{
		/* data is an address. */
		/* get type of addressed memory cell: data or code word. */
		CodeBlock* destination_c = 0;
		/* get addressed memory cell.*/
		DataBlock* destination_d = 0;
		if (!get_label(&destination_c, &destination_d, data->destination_label, labeltree)){
			if (!no_error_printing) {
				fprintf(stderr,"Internal error: Cannot find label %s again.\n", data->destination_label);
			}
			return -1; /*ERROR! */
		}
		/* destination_type: CODE = 0; DATA = 1 */
		/* cast destination pointer according to destination_type. */
		/* add offset to destination address */
		if (destination_c != NULL) {
			value = destination_c->offset + data->number;
		}else if (destination_d != NULL) {
			value = destination_d->offset + data->number;
		}else{
			if (!no_error_printing) {
				fprintf(stderr,"Internal error: Invalid type of label %s.\n",data->destination_label);
			}
			return -1; /*ERROR! */
		}
		/* subtract one from pointer address: this is done to compensate the auto increment of C and D register in Malbolge. */
		/* handle underflow */
		if (value == 0)
			value = C2;
		else
			value--;
	}
	return value;
}

/**
 * Recursively evaluates a DataCell expression tree to a numeric value.
 *
 * Handles all arithmetic operators (PLUS, MINUS, TIMES, DIVIDE, ROTATE_R,
 * ROTATE_L, CRAZY) and leaf nodes by delegating to parse_dataatom().
 * Returns -1 on error; the result is normalized to [0, C2].
 */
static int parse_datacell(DataCell* data, LabelTree* labeltree, int no_error_printing) {
	int value = -1;
	int left = -1;
	int right = -1;
	if (data==0)
		return -1; /* ERROR */
	if (data->leaf_element != 0) {
		return parse_dataatom(data->leaf_element, labeltree, no_error_printing);
	}
	left = parse_datacell(data->left_element, labeltree, no_error_printing);
	if (left<0 || left > C2)
		return -1;
	right = parse_datacell(data->right_element, labeltree, no_error_printing);
	if (right<0 || right > C2)
		return -1;
	switch (data->_operator) {
		case DATACELL_OPERATOR_PLUS:
			value = left + right;
			break;
		case DATACELL_OPERATOR_MINUS:
			value = left - right;
			break;
		case DATACELL_OPERATOR_TIMES:
			value = left * right;
			break;
		case DATACELL_OPERATOR_DIVIDE:
			value = left / right;
			break;
		case DATACELL_OPERATOR_CRAZY:
			value = crazy(left, right);
			break;
		case DATACELL_OPERATOR_ROTATE_L:
			/* WARN IF GREATER/EQUAL 10! */
			if (right >= 10 && !no_error_printing) {
				fprintf(stderr,"Warning: Rotate left operator (<<) with right operand greater or equal 10 found.\n");
				right %= 10;
			}
			{
				int i=0;
				value = left;
				if (right == 0)
					break;
				for (i=right;i<10;i++)
					value = rotate_right(value);
			}
			break;
		case DATACELL_OPERATOR_ROTATE_R:
			/* WARN IF GREATER/EQUAL 10! */
			if (right >= 10 && !no_error_printing) {
				fprintf(stderr,"Warning: Rotate right operator (>>) with right operand greater or equal 10 found.\n");
				right %= 10;
			}
			{
				int i=0;
				value = left;
				if (right == 0)
					break;
				for (i=0;i<right;i++)
					value = rotate_right(value);
			}
			break;
		default:
			return -1; /* ERROR */
	}
	/* normalize value (may be critical for negative shift values!) */
	if (value > C2)
		value %= C2;
	while (value < 0)
		value += C2+1;
	return value;
}

int generate_opcodes_from_memory_layout(MemoryCell* memory_layout, int last_preinitialized, int* opcodes, LabelTree* labeltree, int no_error_printing, int ignore_fixed_offsets_in_preinitialized_section){
	int i;
	int last_opcode_from_33_to_126 = 81; /* store it to find best value for reserved code word */
	for (i=0;i<=C2;i++){
		opcodes[i] = -1;
		if (memory_layout[i].usage == CODE || memory_layout[i].usage == PREINITIALIZED_CODE) {
			char symbol;
			if (!is_xlatcycle_existent(memory_layout[i].code->command, i%94, &symbol)){
				if (!no_error_printing)
					fprintf(stderr,"Internal error: Cannot find xlat2 cycle again.\n");
				return 0; /*ERROR! */
			}
			opcodes[i] = (unsigned char)symbol;
			if (i > last_preinitialized) {
				last_opcode_from_33_to_126 = opcodes[i];
			}
			if (i <= last_preinitialized && !(i>=128 && (i<4096 || (getenv("SCATTER_INIT") && i>=6500 && i<7775))) && !is_valid_initial_character(i%94, symbol) && !ignore_fixed_offsets_in_preinitialized_section) {
				if (!no_error_printing)
					fprintf(stderr,"Error: Invalid symbol in preinitialized code section.\n");
				return 0; /* ERROR! */
			}
		}else if (memory_layout[i].usage == DATA) {
			int data = parse_datacell(memory_layout[i].data->data, labeltree, no_error_printing);
			if (data < 0){
					if (!no_error_printing)
						fprintf(stderr,"Internal error: Found negative value in data segment.\n");
					return 0; /*ERROR! */
			}
			opcodes[i] = data;
			if (opcodes[i] < 127 && opcodes[i] > 32) {
				last_opcode_from_33_to_126 = opcodes[i];
			}
			if (i <= last_preinitialized && !(i==83 || i==40 || i==29444 || i==29445 || i==29528) && !((i<4096 || (getenv("SCATTER_INIT") && i>=6500 && i<7775)) && !(i>=33 && i<=40) && !(i>=48 && i<=55) && !(i>=71 && i<=78) && !(i>=82 && i<=96)) && !ignore_fixed_offsets_in_preinitialized_section) {
				if (!no_error_printing)
					fprintf(stderr, "Error: Invalid offset in data section.\n");
				return 0; /*ERROR! */
			}
		}else if (memory_layout[i].usage == RESERVED_CODE) {
            if(getenv("COMPACT_INIT") && i>=1600 && (i<4096 || (getenv("SCATTER_INIT") && i>=6500 && i<7776))) {
                int v=(68-(i%94)+94)%94;if(v<33)v+=94;opcodes[i]=v;
            }else if (i > last_preinitialized) {
				opcodes[i] = (((i%2)==(last_preinitialized%2))?81:last_opcode_from_33_to_126);
			}
		}
	}
	return 1;
}


/*
 * Constants describing the initial state of the constant-generation data
 * module directly after the init_datamodule prefix has been executed.
 * These values are tightly coupled to the init_datamodule byte string and
 * must not be changed independently of it.
 */
#define INIT_A_REG       58328  /**< A register value after init_datamodule runs. */
#define INIT_MODULE      0      /**< D register module index after init_datamodule. */
#define INIT_POS_IN_MOD  8      /**< D register position within that module. */
#define INIT_DEST_VAL    68     /**< Initial value of the DESTINATION cell. */
#define INIT_TMP_VAL     C1     /**< Initial value of the TMP cell. */
#define INIT_VAL1        126    /**< Initial value of module 1's variable cell. */
#define INIT_VAL2        58688  /**< Initial value of module 2's variable cell. */
#define INIT_VAL3        29495  /**< Initial value of module 3's variable cell. */

/** Shorthand for an unset (unused) module cell initializer. */
#define UNSET_MODULE_CELL {CELLTYPE_CONST, 0, {0, 0}}

int generate_malbolge_initialization_code(int program[], int last_preinitialized, int entrypoint, char malbolge_code[], int no_error_printing, int* execution_steps_until_entry_point, int ignore_wrong_size) {

    if(getenv("DUMP_IMAGE")){FILE *f=fopen(getenv("DUMP_IMAGE"),"wb");fwrite(&entrypoint,4,1,f);fwrite(program,4,59049,f);fclose(f);}
	int size_left = 59049;
    int term_a=82,term_b=81;
	char normalized_code_array[59050];
	char* normalized_code_iterator = 0;
	int size = 0;
	int init_datamodule_length;

	/* Malbolge code that initializes the constant generation data module. */
	const char* init_datamodule = "bP" /* Jmp; Destination for MovD */
			"&A@?>=<;:9876543210/.-,+*)('&%$T\"!~}|;]yxwvutslUSRQ.y"
			"x+i)J9edFb4`_^]\\yxwRQ)(TSRQ]m!G0KJIyxFvDa%_@?\"=<5:98"
			"765.-2+*/.-,+*)('&%$#\"!~}|utyrqvutsrqjonmPkjihgfedc\\"
			"DDYAA\\>>Y;;V886L5322G//D,,G))>&&A##!7~5:{y7xvuu,10/.-"
			",+*)('&%$#\"yb}|{zyxwvutmVqSohmOOjihafeHcEa`YAA\\[ZYRW"
			":U7SLKP3NMLK-I,GFED&%%@?>=6;|9y70/4u210/o-n+k)\"!gg$#\""
			"!x}`{zyxZvYtsrqSoRmlkjLhKfedcEaD_^]\\>Z=XWVU7S6QPON0LK"
			"DI,GFEDCBA#?\"=};438y6543s1r/o-&%*k('&%e#d!~}|^z]xwvuW"
			"sVqponPlOjihgIeHcba`B^A\\[ZY;W:UTSR4PI2MLKJ,,AFE(&B;:?"
			"\"~<}{zz165v3s+*/pn,mk)jh&ge#db~a_{^\\xwvoXsrqpRnmfkjM"
			"Kg`_GG\\aDB^A?[><X;9U86R53ONM0KJC,+FEDC&A@?!!6||3876w4"
			"-tr*/.-&+*)('&%$e\"!~}|utyxwvutWlkponmlOjchg`edGba`_XW"
			"\\?ZYRQVOT7RQPINML/JIHAFEDC&A@?>!<;{98yw5.-ss*/pn,+lj("
			"!~ff{\"ca}`^z][wZXtWUqTRnQOkNLhgfIdcFaZ_^A\\[Z<XW:U8SR"
			"QPOHML/JIHG*ED=%%:?>=~;:{876w43210/(-,+*)('h%$d\"ca}|_"
			"z\\rqYYnsVTpoRPledLLafIGcbE`BXW??TY<:V97S64P31M0.J-+G*"
			"(DCB%@?\"=<;|98765.3210p.-n+$)i'h%${\"!~}|{zyxwvuXVlkp"
			"SQmlOjLbafIGcbE`BXW??TY<:V97S64P31M0.J-+G*(D'%A@?\"=<}"
			":98y6543,1r/.o,+*)j'&%eez!~a|^tsx[YutWUqjinQOkjMhJ`_dG"
			"EaDB^A?[><X;9U86R53O20LKJ-HG*ED'BA@?>7~;:{y7x5.3210q.-"
			"n+*)jh&%$#\"c~}`{z]rwvutWrkpohmPkjihafI^cba`_^A\\[>YXW"
			":UTS5QP3NM0KJ-HGF?D'BA:?>=~;:z8765v32s0/.-nl$#(ig%fd\""
			"ca}|_]yrqvYWsVTpSQmPNjMKgJHdGEa`_B]\\?ZY<WVUTMR5PO20LK"
			".IHA))>CB%#?87}}49zx6wu3tr0qo-nl*ki'hf$ec!~}`{^yxwvots"
			"rUponQlkMihKIe^]EEZ_B@\\?=Y<:V97S64P31M0.J-+GFE(C&A@?8"
			"=<;:{876w43s10qo-&%kk\"'hf$ec!b`|_]y\\ZvYWsVTpSQmlkNiL"
			"gf_dcba`C^]\\?ZY;WV97SLK33HM0.J-+G*(D'%A$\">!};|z8yw54"
			"3t1r/(";

	/*
	 * Virtual machine state immediately after the init_datamodule prefix has
	 * been executed.  This matches the layout described in datamodule.txt:
	 *
	 *   Module 0 (offset 82): coordinator module with 15 cells
	 *   Modules 1-3 (offsets 33-40, 48-55, 71-78): value-generation modules
	 *
	 * The State struct tracks all cells that the initialization code may read
	 * or modify so that the code generator can reason about register values.
	 */
	State cur_state = {
		INIT_A_REG,
		{INIT_MODULE, INIT_POS_IN_MOD},
		{
			/* Module 0: coordinator (15 cells at offset 82-96) */
			{15, {
				{CELLTYPE_CONST, C0,  {0, 0}},
				{CELLTYPE_PTR,   0,   {0, 12}},
				{CELLTYPE_PTR,   0,   {1, 1}},
				{CELLTYPE_PTR,   0,   {2, 1}},
				{CELLTYPE_PTR,   0,   {3, 1}},
				{CELLTYPE_CONST, C1,  {0, 0}},
				{CELLTYPE_VAR,   INIT_TMP_VAL,                          {0, 0}},
				{CELLTYPE_VAR,   C2 - 2*9 - 2*9*3 - 2*9*9 - 2*9*9*3,   {0, 0}},
				{CELLTYPE_VAR,   C2 - 2*9 - 2*9*3 - 2*9*9,              {0, 0}},
				{CELLTYPE_VAR,   C2 - 2*9 - 2*9*3,                      {0, 0}},
				{CELLTYPE_VAR,   C2 - 2*9,                              {0, 0}},
				{CELLTYPE_CONST, C2,  {0, 0}},
				{CELLTYPE_VAR,   INIT_DEST_VAL,                         {0, 0}},
				{CELLTYPE_PTR,   0,   {0, 6}},
				{CELLTYPE_PTR,   0,   {0, 0}}
			}},
			/* Module 1: value generator (8 cells at offset 33-40) */
			{8, {
				{CELLTYPE_CONST,      C0,   {0, 0}},
				{CELLTYPE_CONST,      C1,   {0, 0}},
				{CELLTYPE_C20_OR_C21, C21,  {0, 0}},
				{CELLTYPE_VAR,        INIT_VAL1, {0, 0}},
				{CELLTYPE_CONST,      C2,   {0, 0}},
				{CELLTYPE_PTR,        0,    {1, 3}},
				{CELLTYPE_PTR,        0,    {1, 0}},
				{CELLTYPE_PTR,        0,    {0, 12}},
				UNSET_MODULE_CELL, UNSET_MODULE_CELL, UNSET_MODULE_CELL,
				UNSET_MODULE_CELL, UNSET_MODULE_CELL, UNSET_MODULE_CELL,
				UNSET_MODULE_CELL
			}},
			/* Module 2: value generator (8 cells at offset 48-55) */
			{8, {
				{CELLTYPE_CONST,      C0,   {0, 0}},
				{CELLTYPE_CONST,      C1,   {0, 0}},
				{CELLTYPE_C20_OR_C21, C21,  {0, 0}},
				{CELLTYPE_VAR,        INIT_VAL2, {0, 0}},
				{CELLTYPE_CONST,      C2,   {0, 0}},
				{CELLTYPE_PTR,        0,    {2, 3}},
				{CELLTYPE_PTR,        0,    {2, 0}},
				{CELLTYPE_PTR,        0,    {0, 12}},
				UNSET_MODULE_CELL, UNSET_MODULE_CELL, UNSET_MODULE_CELL,
				UNSET_MODULE_CELL, UNSET_MODULE_CELL, UNSET_MODULE_CELL,
				UNSET_MODULE_CELL
			}},
			/* Module 3: value generator (8 cells at offset 71-78) */
			{8, {
				{CELLTYPE_CONST,      C0,   {0, 0}},
				{CELLTYPE_CONST,      C1,   {0, 0}},
				{CELLTYPE_C20_OR_C21, C21,  {0, 0}},
				{CELLTYPE_VAR,        INIT_VAL3, {0, 0}},
				{CELLTYPE_CONST,      C2,   {0, 0}},
				{CELLTYPE_PTR,        0,    {3, 3}},
				{CELLTYPE_PTR,        0,    {3, 0}},
				{CELLTYPE_PTR,        0,    {0, 12}},
				UNSET_MODULE_CELL, UNSET_MODULE_CELL, UNSET_MODULE_CELL,
				UNSET_MODULE_CELL, UNSET_MODULE_CELL, UNSET_MODULE_CELL,
				UNSET_MODULE_CELL
			}}
		},
		0 /* last_preinitialized — filled in below */
	};

	cur_state.last_preinitialized = last_preinitialized;

	init_datamodule_length = (int)strlen(init_datamodule);
    for(int k=0;k<=C2;k++) {
        int v=program[k];
        int acceptable=v>=33 && v<=126;
        if(v>=33 && v<=126 && !is_valid_initial_character(k%94,v))acceptable=0;
        int filler=(68-(k%94)+94)%94;if(filler<33)filler+=94;
        if(k>=init_datamodule_length && k<=last_preinitialized && !(getenv("COMPACT_INIT") && k>=1600 && (k<4095 || (getenv("SCATTER_INIT") && k>=6500 && k<7775)))){filler=(68-(k%94)+94)%94;if(filler<33)filler+=94;}
        if(!acceptable && v>=0 && getenv("COMPACT_INIT") && k>=1600 && (k<4095 || (getenv("SCATTER_INIT") && k>=6500 && k<7775))) {
            int best=1000;
            for(int raw=33;raw<=126;raw++) {
                if(raw==9 || raw==10 || raw==11 || raw==12 || raw==13 || raw==32 || raw==133 || raw==160)continue;
                if(raw>=33 && raw<=126 && !is_valid_initial_character(k%94,raw))continue;
                int canonical=0,power=1;
                for(int t=0,n=v;t<10;t++,n/=3,power*=3)canonical+=(t<5?2:(n%3==0?1:(n%3==1?0:2)))*power;
                unsigned a=get_register_a_value_for_crazy(raw,v,canonical);
                if(a==0xFFFF)continue;
                int score=0;
                for(int n=a,c=canonical,t=0;t<10;t++,n/=3,c/=3)score+=(n%3!=c%3);
                if(score<best){best=score;filler=raw;}
            }
        }
        if(k==4095 || (getenv("SCATTER_INIT") && k==7775)){filler=(68-(k%94)+94)%94;if(filler<33)filler+=94;acceptable=0;}
        binary_raw[k]=acceptable?v:filler;
        binary_values[k]=k<init_datamodule_length?prefix_after[k]:binary_raw[k];
        binary_flexible[k]=program[k]>=0 && ((k>=1600 && k<4095) || (getenv("SCATTER_INIT") && k>=6500 && k<7775));
    }

    if(getenv("NORMAL_FILL")) {
        for(int k=0;k<=C2;k++) {
            binary_flexible[k]=0;
            if(k<init_datamodule_length)binary_values[k]=prefix_after[k];
            else if(k<=last_preinitialized) {
                int raw=(68-k%94+94)%94;if(raw<33)raw+=94;
                if(program[k]>=0 && is_valid_initial_character(k%94,program[k]))raw=program[k];
                binary_values[k]=raw;binary_raw[k]=raw;
            }else binary_values[k]=crazy(binary_values[k-1],binary_values[k-2]);
        }
        int best=-1;
        for(int aa=33;aa<=126;aa++)if(is_valid_initial_character((last_preinitialized-1)%94,aa))
        for(int bb=33;bb<=126;bb++)if(is_valid_initial_character(last_preinitialized%94,bb)) {
            int vals[14],score=0;vals[0]=aa;vals[1]=bb;
            for(int k=2;k<14;k++)vals[k]=crazy(vals[k-1],vals[k-2]);
            for(int k=last_preinitialized+1;k<=C2;k++)if(program[k]>=0 && vals[2+(k-last_preinitialized-1)%12]==program[k])score++;
            if(score>best){best=score;term_a=aa;term_b=bb;}
        }
        if(getenv("PARSER_TABLE")) {
            term_a=37;term_b=81;
            if(!is_valid_initial_character((last_preinitialized-1)%94,term_a) ||
               !is_valid_initial_character(last_preinitialized%94,term_b))return -1;
        }
        binary_values[last_preinitialized-1]=term_a;binary_values[last_preinitialized]=term_b;
        for(int k=last_preinitialized+1;k<=C2;k++)binary_values[k]=crazy(binary_values[k-1],binary_values[k-2]);
        if(getenv("INIT_STATS"))fprintf(stderr,"Terminator %d,%d at %d, skip score %d\n",term_a,term_b,last_preinitialized,best);
    }


	/* Prepend the data-module initialization prefix to the output buffer. */
	memcpy(normalized_code_array, init_datamodule, init_datamodule_length);

	size_left = 59049 - init_datamodule_length;
	normalized_code_iterator = normalized_code_array + init_datamodule_length;

    if(getenv("COMPACT_INIT")) {
        int n=generate_jump_to_entrypoint_with_module_system(4096,normalized_code_iterator,&cur_state,size_left,no_error_printing);
        if(n<=0 || normalized_code_iterator[n-1]!='j')return -1;
        normalized_code_iterator[n-1]='i';
        cur_state.d_reg.module=0;cur_state.d_reg.pos=13;
        if(init_datamodule_length+n>=1600)return -1;
        if(!denormalize_malbolge(normalized_code_array+init_datamodule_length,init_datamodule_length,n,no_error_printing))return -1;
        for(int k=init_datamodule_length+n;k<4096;k++)normalized_code_array[k]=binary_raw[k];
        normalized_code_iterator=normalized_code_array+4096;
        size_left=59049-4096;
    }
	/* Generate normalized initialization code for every cell that needs a
	 * runtime-written value (cells after last_preinitialized). */
    if(getenv("INIT_STATS")){int count=0,skip=0;for(int k=0;k<=C2;k++)if(program[k]>=0){count++;skip+=(program[k]==binary_values[k]);}fprintf(stderr,"Words: %d, preloaded: %d\n",count,skip);}
    size=generate_normalized_init_code_for_word_with_module_system(244,81,normalized_code_iterator,&cur_state,size_left,no_error_printing);
    if(size<0)return -1;
    size_left-=size;normalized_code_iterator+=size;
    if(getenv("STAGE_PRELOAD")) {
        int n=stage_scan(2187,3402,program,normalized_code_iterator,&cur_state,size_left);
        if(n<0)return -1;
        normalized_code_iterator+=n;size_left-=n;
        n=generate_jump_to_entrypoint_with_module_system(7776,normalized_code_iterator,&cur_state,size_left,1);
        if(n<0 || normalized_code_iterator[n-1]!='j')return -1;
        normalized_code_iterator[n-1]='i';cur_state.d_reg.module=0;cur_state.d_reg.pos=13;
        normalized_code_iterator+=n;size_left-=n;
        while(normalized_code_iterator-normalized_code_array<6500){*normalized_code_iterator++='o';size_left--;}
        for(int k=6500;k<7776;k++){*normalized_code_iterator++=binary_raw[k];size_left--;}
        n=stage_scan(6500,7775,program,normalized_code_iterator,&cur_state,size_left);
        if(n<0)return -1;
        normalized_code_iterator+=n;size_left-=n;
    }
    if(getenv("EXTRA_CACHE"))for(int m=4;m<NUM_MODULES;m++) {
        int base=100+8*(m-4),vals[8]={0,C1,C2-1,C1,C2,base+2,base-1,93};
        for(int q=0;q<8;q++) {
            int n=generate_normalized_init_code_for_word_with_module_system(base+q,vals[q],normalized_code_iterator,&cur_state,size_left,1);
            if(n<0)return -1;
        normalized_code_iterator+=n;size_left-=n;binary_values[base+q]=vals[q];
        }
        Module mod={8,{{CELLTYPE_CONST,0,{0,0}},{CELLTYPE_CONST,C1,{0,0}},{CELLTYPE_C20_OR_C21,C2-1,{0,0}},{CELLTYPE_VAR,C1,{0,0}},{CELLTYPE_CONST,C2,{0,0}},{CELLTYPE_PTR,0,{m,3}},{CELLTYPE_PTR,0,{m,0}},{CELLTYPE_PTR,0,{0,12}}}};
        cur_state.modules[m]=mod;
    }
    const int deferred_at[5]={29444,29445,29528,83,40};
    int deferred[5];
    if(getenv("PARSER_TABLE"))for(int q=0;q<5;q++){deferred[q]=program[deferred_at[q]];program[deferred_at[q]]=-1;}
    int saved_guard=program[244];program[244]=-1;
    size=generate_init_beam(program,0,normalized_code_iterator,&cur_state,size_left);
    program[244]=saved_guard;
    if(size<0)return -1;
    size_left-=size;normalized_code_iterator+=size;
    if(getenv("PARSER_TABLE")) {
 const char *encryption="5z]&gqtyfr$(we4{WP)H-Zn,[%\\3dL+Q;>U!pJS72FhOA1CB6v^=I_0/8|jsb9m<.TVac`uY*MK'X~xDl}REokN:#?G\"i@";
        if(normalized_code_iterator-normalized_code_array<=29529)return -1;
        /* Every emitted initialization instruction has executed once by this point.
         * Navigation out of a reclaimed cell can read its neighboring source cells. */
        for(int k=init_datamodule_length;k<normalized_code_iterator-normalized_code_array;k++){
            char raw=normalized_code_array[k];
            if(!denormalize_malbolge(&raw,k,1,1))return -1;
            binary_values[k]=(unsigned char)encryption[(unsigned char)raw-33];
        }
        if(getenv("INIT_STATS"))fprintf(stderr,"Main init %ld left %d\n",normalized_code_iterator-normalized_code_array,size_left);
        for(int q=0;q<5;q++) {
            int k=deferred_at[q];
            if(k>=1433){
                char raw=normalized_code_array[k];
                if(!denormalize_malbolge(&raw,k,1,1))return -1;
                binary_values[k]=(unsigned char)encryption[(unsigned char)raw-33];
            }else{
                /* Reclaim links only after their initialization roles have ended. */
                int m=k==83?0:1,p=k==83?1:7;
                cur_state.modules[m].cells[p].type=CELLTYPE_VAR;
                cur_state.modules[m].cells[p].value=93;
                binary_values[k]=93;
            }
            if(k==40)size=generate_word_choice(k,deferred[q],normalized_code_iterator,&cur_state,size_left,2*(NUM_MODULES-1)+1);
            else if(k==83) {
                int best=-1;State winner;char trial[4096],chosen[4096];
                for(int choice=0;choice<6*(NUM_MODULES-1);choice++){
                    State st=cur_state;int n=generate_word_choice(k,deferred[q],trial,&st,size_left<4096?size_left:4096,choice);
                    if(n>=0 && (best<0 || n<best)){best=n;winner=st;memcpy(chosen,trial,n);}
                }
                size=best;if(best>=0){cur_state=winner;memcpy(normalized_code_iterator,chosen,best);}
            }else size=generate_normalized_init_code_for_word_with_module_system(k,deferred[q],normalized_code_iterator,&cur_state,size_left,1);
            if(getenv("INIT_STATS"))fprintf(stderr,"Deferred %d size %d\n",k,size);
            if(size<0)return -1;
            size_left-=size;normalized_code_iterator+=size;program[k]=deferred[q];
        }
    }
    if(getenv("PRELOAD_SEARCH")) {
        for(int k=1600;k<4095;k++)normalized_code_array[k]=binary_raw[k];
        if(getenv("SCATTER_INIT"))for(int k=6500;k<7775;k++)normalized_code_array[k]=binary_raw[k];
    }

	/* Append the jump to the program entry point. */
    if(getenv("PARSER_TABLE")) {
        /* Last write leaves D=41. Cell 42 holds ENTRY-1. */
        if(size_left<2)return -1;
        memcpy(normalized_code_iterator,"oj",2);size=2;
    }else {
	size = generate_jump_to_entrypoint_with_module_system(
		entrypoint, normalized_code_iterator, &cur_state, size_left, no_error_printing);
    }
	if (size < 0) {
		if (!no_error_printing)
			fprintf(stderr, "Internal error: Cannot generate jump to entry point %d.\n", entrypoint);
		return -1;
	}
	size_left -= size;
	normalized_code_iterator += size;
	*normalized_code_iterator = 0;

	if (size_left < 0) {
		if (!no_error_printing)
			fprintf(stderr, "Error: Initialization code exceeds available memory.\n");
		return -1;
	}

	/*
	 * Place the 'i' (In) instruction that hands control from the initialization
	 * sequence to the HeLL program's entry point.  The constant 98 accounts for
	 * the 2 cells of the initial "bP" jump plus the 96-cell data module that
	 * Malbolge has already executed past.
	 */
	normalized_code_array[59049 - size_left] = 'i';
	if (execution_steps_until_entry_point != NULL)
		*execution_steps_until_entry_point = (59049 - size_left) - 98;
	size_left--;

	if(getenv("INIT_STATS"))fprintf(stderr,"INIT size %d; allowed %d\n",59049-size_left,last_preinitialized-1);
	if (59049 - size_left > last_preinitialized - 1)
		return -1; /* initialization code overflows the pre-initialized region */


    if(getenv("NORMAL_FILL")) {
        int end=59049-size_left;
        int first_protected=last_preinitialized-1;
        for(int k=init_datamodule_length;k<last_preinitialized-1;k++)if(program[k]>=0 && !(getenv("PARSER_TABLE") && (k==29444 || k==29445 || k==29528))){first_protected=k;break;}
        if(end+256>first_protected){if(getenv("INIT_STATS"))fprintf(stderr,"Initializer requires 256 cells of separation.\n");return -1;}

        if(!denormalize_malbolge(normalized_code_array+init_datamodule_length,init_datamodule_length,end-init_datamodule_length,1))return -1;
        for(int k=init_datamodule_length;k<end;k++)if(program[k]>=0 && !(getenv("PARSER_TABLE") && (k==29444 || k==29445 || k==29528)))return -1;
        for(int k=end;k<last_preinitialized-1;k++)normalized_code_array[k]=binary_raw[k];
        normalized_code_array[last_preinitialized-1]=term_a;normalized_code_array[last_preinitialized]=term_b;normalized_code_array[last_preinitialized+1]=0;
        memcpy(malbolge_code,normalized_code_array,last_preinitialized+2);
        return end;
    }
    int init_end=59049-size_left;
    int code_start=getenv("COMPACT_INIT")?4096:init_datamodule_length;
    if(getenv("SCATTER_INIT")) {
        if(!denormalize_malbolge(normalized_code_array+code_start,code_start,6500-code_start,no_error_printing))return -1;
        if(!denormalize_malbolge(normalized_code_array+7776,7776,init_end-7776,no_error_printing))return -1;
    }else if(!denormalize_malbolge(normalized_code_array+code_start,
           code_start,init_end-code_start,no_error_printing))return -1;
    for(int k=init_end;k<=C2;k++)normalized_code_array[k]=binary_raw[k];
    normalized_code_array[59049]=0;
    memcpy(malbolge_code,normalized_code_array,59050);
    return init_end;
}
