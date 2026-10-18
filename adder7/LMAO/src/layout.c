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

#include "layout.h"
#include "malbolge.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int add_codeblock_to_memory_layout(CodeBlock *block,
                                   MemoryCell memory_layout[],
                                   unsigned char possible_positions_mod_94[],
                                   int must_be_initialized) {
	if (block == NULL || memory_layout == NULL || possible_positions_mod_94 == NULL)
		return 0;

	if (block->offset >= 0) {
		/* Place at the fixed offset given by the .OFFSET directive. */
		int offset;
		if (block->offset > C2)
			return 0;
		/* Reserve the cell immediately before the block. */
		offset = (block->offset > 0) ? block->offset - 1 : C2;
		if (memory_layout[offset].usage != UNUSED)
			return 0;
		memory_layout[offset].usage = RESERVED_CODE;
		COPY_CODE_POSITION(memory_layout[offset].code_position,
		                   block->code_position, block->code_position);
		memory_layout[offset].code_position.last_line =
			memory_layout[offset].code_position.first_line;
		memory_layout[offset].code_position.last_column =
			memory_layout[offset].code_position.first_column;

		offset = block->offset;
		while (block != NULL) {
			offset %= MALBOLGE_MEMORY_SIZE;
			if (memory_layout[offset].usage != UNUSED)
				return 0;
			memory_layout[offset].usage =
				must_be_initialized ? CODE : PREINITIALIZED_CODE;
			memory_layout[offset].code = block;
			COPY_CODE_POSITION(memory_layout[offset].code_position,
			                   block->code_position, block->code_position);
			block = block->next;
			offset++;
		}
		return 1;
	}

	/* No fixed offset: find the first valid position. */
	{
		int try_pos = 1; /* Reserve cell 0 for the RESERVED_CODE prefix slot. */

		do {
			int match;
			int cur_pos;
			CodeBlock *cur_block;

			/* Advance to the next position allowed by the xlat2 constraint. */
			while (try_pos < C2 && !possible_positions_mod_94[try_pos % 94])
				try_pos++;
			if (!possible_positions_mod_94[try_pos % 94])
				return 0;

			/* The cell before the block must be free for RESERVED_CODE. */
			if (memory_layout[try_pos > 0 ? try_pos - 1 : C2].usage != UNUSED) {
				try_pos++;
				continue;
			}

			/* Check that all cells of the block are free. */
			match = 1;
			cur_pos = try_pos;
			cur_block = block;
			while (cur_block != NULL) {
				if (memory_layout[cur_pos].usage != UNUSED) {
					match = 0;
					break;
				}
				cur_pos++;
				cur_pos %= MALBOLGE_MEMORY_SIZE;
				cur_block = cur_block->next;
			}
			if (match)
				break;

			try_pos++;
			if (try_pos >= C2)
				return 0;
		} while (1);

		/* Place the block. */
		{
			int pre_offset = (try_pos > 0) ? try_pos - 1 : C2;
			int cur_pos = try_pos;
			CodeBlock *cur_block = block;

			memory_layout[pre_offset].usage = RESERVED_CODE;
			COPY_CODE_POSITION(memory_layout[pre_offset].code_position,
			                   cur_block->code_position, cur_block->code_position);
			memory_layout[pre_offset].code_position.last_line =
				memory_layout[pre_offset].code_position.first_line;
			memory_layout[pre_offset].code_position.last_column =
				memory_layout[pre_offset].code_position.first_column;

			while (cur_block != NULL) {
				memory_layout[cur_pos].usage =
					must_be_initialized ? CODE : PREINITIALIZED_CODE;
				memory_layout[cur_pos].code = cur_block;
				COPY_CODE_POSITION(memory_layout[cur_pos].code_position,
				                   cur_block->code_position, cur_block->code_position);
				cur_pos++;
				cur_pos %= MALBOLGE_MEMORY_SIZE;
				cur_block = cur_block->next;
			}
		}
		return 1;
	}
}

static void alignment_vote(DataCell *cell,int parity,int score[2]){
 if(!cell)return;
 if(cell->_operator==DATACELL_OPERATOR_LEAF_ELEMENT && cell->leaf_element && cell->leaf_element->destination_label){
   DataAtom *atom=cell->leaf_element;const char *name=atom->destination_label;
   int wanted=1,weight=1;
   if(!strcmp(name,"MOVED")){wanted=atom->number==0?0:1;weight=atom->number==0?3:1;}
   else if(!strcmp(name,"CRAZY")||!strcmp(name,"ROT")||!strcmp(name,"IN")||!strcmp(name,"OUT")||!strcmp(name,"HALT"))return;
   score[parity^wanted]+=weight;
 }else if(cell->_operator<8){alignment_vote(cell->left_element,parity,score);alignment_vote(cell->right_element,parity,score);}
}
int add_datablock_to_memory_layout(DataBlock *block, MemoryCell memory_layout[]) {
	if (block == NULL || memory_layout == NULL)
		return 0;

	if (block->offset >= 0) {
		/* Place at the fixed offset. */
		int offset = block->offset;
		while (block != NULL) {
			offset %= MALBOLGE_MEMORY_SIZE;
			if (block->data->_operator != DATACELL_OPERATOR_NOT_USED) {
				if (memory_layout[offset].usage != UNUSED)
					return 0;
				memory_layout[offset].usage =
					(block->data->_operator == DATACELL_OPERATOR_DONTCARE)
					? RESERVED_DATA : DATA;
				memory_layout[offset].data = block;
				COPY_CODE_POSITION(memory_layout[offset].code_position,
				                   block->code_position, block->code_position);
			}
			block = block->next;
			offset++;
		}
		return 1;
	}

	/* No fixed offset: find the first valid position. */
	{
        int preferred=-1;
        if(getenv("ALIGN_DATA")){
            int score[2]={0,0},offset=0;
            for(DataBlock *b=block;b;b=b->next,offset++)alignment_vote(b->data,offset%2,score);
            if(score[0]!=score[1])preferred=score[1]>score[0];
        }
		int try_pos = 0;

		do {
			int match = 1;
            if(preferred>=0 && try_pos%2!=preferred)try_pos++;
			int cur_pos = try_pos;
			DataBlock *cur_block = block;

			if (try_pos >= C2)
				return 0;

			while (cur_block != NULL) {
				if (cur_block->data->_operator != DATACELL_OPERATOR_NOT_USED) {
					if (memory_layout[cur_pos].usage != UNUSED) {
						match = 0;
						break;
					}
				}
				cur_pos++;
				cur_pos %= MALBOLGE_MEMORY_SIZE;
				cur_block = cur_block->next;
			}
			if (match)
				break;

			try_pos++;
			if (try_pos >= C2)
				return 0;
		} while (1);

		/* Place the block. */
		{
            if(preferred>=0 && try_pos%2!=preferred)try_pos++;
			int cur_pos = try_pos;
			DataBlock *cur_block = block;
			while (cur_block != NULL) {
				if (cur_block->data->_operator != DATACELL_OPERATOR_NOT_USED) {
					memory_layout[cur_pos].usage =
						(cur_block->data->_operator == DATACELL_OPERATOR_DONTCARE)
						? RESERVED_DATA : DATA;
					memory_layout[cur_pos].data = cur_block;
					COPY_CODE_POSITION(memory_layout[cur_pos].code_position,
					                   cur_block->code_position,
					                   cur_block->code_position);
				}
				cur_pos++;
				cur_pos %= MALBOLGE_MEMORY_SIZE;
				cur_block = cur_block->next;
			}
		}
		return 1;
	}
}

int put_all_memcells_together(MemoryCell fixedoffset[],
                              MemoryCell toinitial[],
                              MemoryCell preinitial[],
                              MemoryCell memory_layout[],
                              int *last_preinitialized_cell,
                              int end_of_initialization_code,
                              int no_error_printing) {
	int last_toinitial = -1;
	int last_preinitial = -1;
	int i;
	int first_fixedoffset_tobeinitialized = C2 + 1;
	int RQ_at_position;
	int startoffset = C2 + 1;

	/* Copy fixed-offset layout into the output array; track extent of toinitial and preinitial. */
	for (i = 0; i <= C2; i++) {
		if (toinitial[i].usage != UNUSED)
			last_toinitial = i;
		if (preinitial[i].usage != UNUSED)
			last_preinitial = i;

		memory_layout[i].usage = fixedoffset[i].usage;
		memory_layout[i].data  = fixedoffset[i].data;
		memory_layout[i].code  = fixedoffset[i].code;
		COPY_CODE_POSITION(memory_layout[i].code_position,
		                   fixedoffset[i].code_position,
		                   fixedoffset[i].code_position);

		if ((fixedoffset[i].usage == CODE || fixedoffset[i].usage == DATA)
				&& i < first_fixedoffset_tobeinitialized)
			first_fixedoffset_tobeinitialized = i;
	}

	/* Place the toinitial section, aligned to a modulo-94 boundary. */
	if (last_toinitial >= 0) {
		int tmp = (last_toinitial + 94 - (C2 % 94)) % 94;
		int matches = 0;
		if (tmp == 0)
			tmp = 94;
		startoffset = C2 - (94 - tmp) - last_toinitial;

		while (startoffset >= 0) {
			for (i = 0; i <= last_toinitial; i++) {
				if (memory_layout[i + startoffset].usage != UNUSED
						&& toinitial[i].usage != UNUSED)
					break;
			}
			if (i == last_toinitial + 1) {
				matches = 1;
				break;
			}
			startoffset -= 94;
		}
		if (!matches)
			return 0;

		for (i = 0; i <= last_toinitial; i++) {
			if (toinitial[i].usage != UNUSED) {
				if (memory_layout[i + startoffset].usage != UNUSED) {
					if (!no_error_printing)
						fprintf(stderr, "Error: Internal error while matching memory areas.\n");
					return 0;
				}
				memory_layout[i + startoffset].usage = toinitial[i].usage;
				memory_layout[i + startoffset].data  = toinitial[i].data;
				memory_layout[i + startoffset].code  = toinitial[i].code;
				COPY_CODE_POSITION(memory_layout[i + startoffset].code_position,
				                   toinitial[i].code_position,
				                   toinitial[i].code_position);
			}
		}
		if (startoffset < first_fixedoffset_tobeinitialized)
			first_fixedoffset_tobeinitialized = startoffset;
	}

	/*
	 * Find a position for the "RQ" terminator sequence.
	 * Valid positions (mod 94): 16, 17, 35, 51, 52, 74, 80, 93.
	 * The sequence must not overlap any preinitialized code.
	 */
	RQ_at_position = -1;
	for (i = startoffset - 2; i >= 0; i--) {
		int m = i % 94;
		if (m == 16 || m == 17 || m == 35 || m == 51
				|| m == 52 || m == 74 || m == 80 || m == 93) {
			if (memory_layout[i].usage != PREINITIALIZED_CODE
					&& memory_layout[i + 1].usage != PREINITIALIZED_CODE) {
				RQ_at_position = i;
				break;
			}
		}
	}
	if (RQ_at_position < 500)
		return 0;

	if (RQ_at_position > end_of_initialization_code)
		RQ_at_position = end_of_initialization_code + 1;

	while (RQ_at_position % 94 != 16 && RQ_at_position % 94 != 17
			&& RQ_at_position % 94 != 35 && RQ_at_position % 94 != 51
			&& RQ_at_position % 94 != 52 && RQ_at_position % 94 != 74
			&& RQ_at_position % 94 != 80 && RQ_at_position % 94 != 93) {
		RQ_at_position++;
	}

	if (last_preinitialized_cell != NULL)
		*last_preinitialized_cell = RQ_at_position + 1;

    if(getenv("NORMAL_FILL") && RQ_at_position>57998)RQ_at_position=57998;
    if(getenv("NORMAL_FILL") && getenv("TERM_MOD")) {
        int wanted=atoi(getenv("TERM_MOD"));
        while((RQ_at_position+1)%94!=wanted)RQ_at_position--;
        *last_preinitialized_cell=RQ_at_position+1;
    }
	/* Place the preinitial section just before the RQ pair. */
	if (last_preinitial >= 0) {
		int matches = 0;
		int pos = RQ_at_position - 1 - last_preinitial;
		pos -= pos % 94;

		while (pos >= 0 && !matches) {
			for (i = 0; i <= last_preinitial; i++) {
				if (memory_layout[i + pos].usage != UNUSED
						&& preinitial[i].usage != UNUSED)
					break;
			}
			if (i == last_preinitial + 1) {
				matches = 1;
				break;
			}
			pos -= 94;
		}
		if (!matches || pos < 0)
			return 0;

		for (i = 0; i <= last_preinitial; i++) {
			if (preinitial[i].usage != UNUSED) {
				if (memory_layout[i + pos].usage != UNUSED) {
					if (!no_error_printing)
						fprintf(stderr, "Error: Internal error while matching memory areas.\n");
					return 0;
				}
				memory_layout[i + pos].usage = preinitial[i].usage;
				memory_layout[i + pos].data  = preinitial[i].data;
				memory_layout[i + pos].code  = preinitial[i].code;
				COPY_CODE_POSITION(memory_layout[i + pos].code_position,
				                   preinitial[i].code_position,
				                   preinitial[i].code_position);
			}
		}
	}
	return 1;
}
