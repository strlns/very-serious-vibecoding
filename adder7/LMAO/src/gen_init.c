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

#include <stdio.h>
#include <string.h>
#include <limits.h>
#include <stdlib.h>
#include "gen_init.h"
#include "malbolge.h"

extern int binary_values[59049];
extern unsigned char binary_flexible[59049];
extern int tracked_address,tracked_value;
static int outside_value(int p){return p==244?81:(p==tracked_address?tracked_value:binary_values[p]);}
static void binary_dreg(State *state,int address) {
    const int offsets[]={82,33,71,48,100,108,116,124};
    state->d_reg.module=-1;state->d_reg.pos=address;
    for(int m=0;m<NUM_MODULES;m++)if(address>=offsets[m] && address<offsets[m]+state->modules[m].num_of_cells){state->d_reg.module=m;state->d_reg.pos=address-offsets[m];break;}
}

static const int module_offsets[NUM_MODULES]={82,33,71,48,100,108,116,124};
static int state_address(State *s) {return s->d_reg.module<0?s->d_reg.pos:module_offsets[s->d_reg.module]+s->d_reg.pos;}
static int state_value(State *s,int p) {
 for(int m=0;m<NUM_MODULES;m++)if(p>=module_offsets[m] && p<module_offsets[m]+s->modules[m].num_of_cells) {
  Cell *c=&s->modules[m].cells[p-module_offsets[m]];
  return c->type==CELLTYPE_PTR?module_offsets[c->destination.module]+c->destination.pos-1:c->value;
 }
 return outside_value(p);
}

/** returns the value needed in the A-Register to turn source into destination by crazy.
 * 0xFFFF if no such value exists. (then source has to be turned into something else e.g. C1)
 * returns a value that contains as less trits as possible different from current_register_a_value
 *
 * \param source TODO
 * \param destination TODO
 * \param current_register_a_value TODO
 * \return TODO
 */
unsigned int get_register_a_value_for_crazy(unsigned int source, unsigned int destination, unsigned int current_register_a_value);

/**
 * TODO
 *
 * \param a TODO
 * \param b TODO
 * \param mask TODO
 * \return TODO
 */
int count_different_trits(unsigned int a, unsigned int b, unsigned int mask);

/** gets a value to transform source to destination that can be generated from current_register_a_value with as less effort as possible.
 * rotations contains the number of rotation operation needed while transforming current_cell_value to the return value of this function. crazy_C2_first indicates whether source should be crazied with C2 before generating destination.
 * returns 0xFFFF if no such value exists.
 *
 * \param source TODO
 * \param destination TODO
 * \param current_register_a_value TODO
 * \param rotations TODO
 * \param crazy_C2_first TODO
 *
 * \return TODO
 */
unsigned int get_best_register_a_value_for_crazy(unsigned int source, unsigned int destination, unsigned int current_register_a_value, int* rotations, int* crazy_C2_first);

/** Adds Malbolge instruction sequence to normalized_init_code and updates cur_state corresponding to the execution of the added Malbolge instructions.
 *
 * \param normalized_init_code Copy Malbolge command into this buffer. Content of the buffer will be overwritten. Won't be terminated by zero.
 * \param current_state (Simplified) state of virtual Malbolge machine. Will be updated corresponding to the added commands.
 * \param add Null terminated string containing normalized Malbolge command sequence that will be copied to normalize_init_code and used to update cur_state.
 * \param max_init_code_length Maximum number of characters that are allowed to be copied to the normalized_init_code buffer.
 * \param no_error_printing TODO
 * \return Number of characters copied to normalized_init_code or -1 on failure. In case of failure partially write operations to normalized_init_code and cur_state may already have taken place. cur_state may be inconsistent in case of failure. */
int add_to_init_code(char* normalized_init_code, State* current_state, const char* add, int max_init_code_length, int no_error_printing);

/** Generates instructions to set the data register to a specific position.
 * Returns the number of commands generated to set the data register or -1 on error.
 *
 * \param normalized_init_code TODO
 * \param current_state TODO
 * \param pos TODO
 * \param max_init_code_length TODO
 * \param no_error_printing TODO
 * \return TODO
 * */
int set_dreg(char* normalized_init_code, State* current_state, DRegPos* pos, int max_init_code_length, int no_error_printing);

/**
 * TODO
 *
 * \param normalized_init_code TODO
 * \param current_state TODO
 * \param module TODO
 * \param position TODO
 * \param max_init_code_length TODO
 * \param no_error_printing TODO
 * \return TODO
 * */
int set_dreg_wrapper(char* normalized_init_code, State* current_state, int module, int position, int max_init_code_length, int no_error_printing);

/**
 * TODO
 *
 * \param target_value TODO
 * \param current_state TODO
 *
 * \return TODO
 */
int get_module_for_constant_generation(int target_value, State* current_state);

/**
 * TODO
 *
 * \param normalized_init_code TODO
 * \param current_state TODO
 * \param constant TODO
 * \param load_from_module TODO
 * \param rotations TODO
 * \param crazy_C2_first TODO
 * \param max_init_code_length TODO
 * \param no_error_printing TODO
 * \return TODO
 * */
int load_constant_to_a_reg(char* normalized_init_code, State* current_state, int constant, int load_from_module, int rotations, int crazy_C2_first, int max_init_code_length, int no_error_printing);

/**
 * TODO
 *
 * \param normalized_init_code TODO
 * \param current_state TODO
 * \param max_init_code_length TODO
 * \param no_error_printing TODO
 * \return TODO
 */
int increment_destination_by_9(char* normalized_init_code, State* current_state, int max_init_code_length, int no_error_printing);


unsigned int get_register_a_value_for_crazy(unsigned int source, unsigned int destination, unsigned int current_register_a_value){

	unsigned int crz[] = {1,0,0,1,0,2,2,2,1};

	unsigned int result = 0;
	unsigned int position = 0;
	unsigned int shift = 1;

	if (crazy(C0, source)==destination)
		return C0;

	if (crazy(C1, source)==destination)
		return C1;

	if (crazy(C2, source)==destination)
		return C2;

	if (crazy(C2-1, source)==destination)
		return C2-1;

	if (crazy(C2-2, source)==destination)
		return C2-2;


	while (position < 10){
		unsigned int k;
		unsigned int i = source%3;
		unsigned int j = destination%3;
		unsigned int cv = current_register_a_value%3;

		unsigned int solution = 4;
		if (crz[cv+3*i]==j) {
			solution = cv;
		}else{
			for (k=0;k<3;k++){
				if (crz[k+3*i]==j) {
					solution = k;
					break;
				}
			}
		}
		if (solution > 2)
			return 0xFFFF;

		result += solution * shift;
		shift *= 3;
		position++;
		source /= 3;
		destination /= 3;
		current_register_a_value /= 3;
	}
	return result;
}


int count_different_trits(unsigned int a, unsigned int b, unsigned int mask){
	int position = 0;
	int result = 0;
	while (position < 10){
		unsigned int i = a%3;
		unsigned int j = b%3;
		unsigned int m = mask%3;
		if (m != 0)
			result += ((i!=j)?1:0);
		a /= 3;
		b /= 3;
		mask /= 3;
		position++;
	}
	return result;
}


unsigned int get_best_register_a_value_for_crazy(unsigned int source, unsigned int destination, unsigned int current_register_a_value, int* rotations, int* crazy_C2_first){

	unsigned int value;
	int i;
	int not_modifiable_mask = C1-1;
	int min_costs = INT_MAX;
	if ((value = get_register_a_value_for_crazy(source, destination, current_register_a_value))==0xFFFF) {
		return 0xFFFF;
	}

	if (value == C0 || value == C1 || value == C2 || value == C2-1 || value == C2-2) {
		if (rotations != 0)
			*rotations = 10;
		if (crazy_C2_first != 0)
			*crazy_C2_first = 0;
		return value;
	}


	for (i=0;i<10;i++) {
		unsigned int constant = get_register_a_value_for_crazy(source, destination, current_register_a_value);
		int diff = count_different_trits(constant, current_register_a_value, C1);
		int diff2 = count_different_trits(constant, crazy(C2, current_register_a_value), C1);
		/* use mask of modifications. */
		int diff_needs_wrap = count_different_trits(constant, current_register_a_value, not_modifiable_mask);
		int diff2_needs_wrap = count_different_trits(constant, crazy(C2, current_register_a_value), not_modifiable_mask);

		int rots_diff = i+(diff_needs_wrap==0?0:10);
		int costs_diff = diff*9+rots_diff*3;
		int rots_diff2 = i+(diff2_needs_wrap==0?0:10);
		int costs_diff2 = diff2*9+rots_diff2*3+2;

		if (costs_diff == 0) {
			costs_diff = 6; /* Crazy with C2 twice to load unchanged source value */
		}

		if (costs_diff < min_costs) {
			min_costs = costs_diff;
			if (rotations != 0)
				*rotations = rots_diff;
			value = constant;
			if (crazy_C2_first != 0)
				*crazy_C2_first = 0;
		}
		if (costs_diff2 < min_costs && crazy_C2_first != 0) {
			min_costs = costs_diff2;
			if (rotations != 0)
				*rotations = rots_diff2;
			value = constant;
			*crazy_C2_first = 1;
		}		

		current_register_a_value = rotate_right(current_register_a_value);
		if (not_modifiable_mask > 0)
			not_modifiable_mask = rotate_right(not_modifiable_mask) - 1;
	}

	return value;
}

int add_to_init_code(char *out,State *s,const char *add,int cap,int quiet) {
 int n=strlen(add);if(n>cap)return -1;
 for(int i=0;i<n;i++) {
  int p=state_address(s),v=state_value(s,p),next=(p+1)%59049;
  char op=add[i];out[i]=op;
  if(op=='j')next=(v+1)%59049;
  else if(op=='*' || op=='p') {
   int value=op=='*'?rotate_right(v):crazy(s->a_reg,v);s->a_reg=value;
   if(s->d_reg.module>=0) {
    Cell *cell=&s->modules[s->d_reg.module].cells[s->d_reg.pos];
    if(cell->type==CELLTYPE_PTR)return -1;
    if(cell->type==CELLTYPE_CONST && value!=v)return -1;
    cell->value=value;
   }else if(p==tracked_address)tracked_value=value;
   else return -1;
  }else if(op!='o')return -1;
  binary_dreg(s,next);
 }
 return n;
}


static int shortest_set_dreg(char*,State*,DRegPos*,int,int);

int set_dreg(char* normalized_init_code, State* current_state, DRegPos* pos, int max_init_code_length, int no_error_printing){
	int result = 0;
	#ifndef DOXYGEN
	#define ADD_CODE(code) { int res = add_to_init_code(normalized_init_code, current_state, (code), max_init_code_length, no_error_printing); if (res < 0) return -1; result += res; normalized_init_code += res; max_init_code_length -= res;}
	#endif
	if (current_state == 0 || normalized_init_code == 0 || pos == 0 || max_init_code_length < 0)
		return -1;
	if (current_state->d_reg.pos > C2 || pos->pos > C2)
		return -1; /* invalid value */

	if (pos->module < 0)
		return -1; /* not supported */
	if (pos->module > 3 || current_state->d_reg.module > 3)
		return -1; /* invalid value */

	if (current_state->modules[pos->module].num_of_cells <= pos->pos)
		return -1; /* invalid value */

	if (current_state->d_reg.module >= 0)
		if (current_state->modules[current_state->d_reg.module].num_of_cells <= current_state->d_reg.pos)
			return -1; /* invalid value */

    if(current_state->d_reg.module<0) {
        static unsigned seen[59049],generation;
        static int previous[59049],queue[59049];
        static char move[59049];
        ++generation;
        int head=0,tail=0,found=-1,start=current_state->d_reg.pos;
        queue[tail++]=start;seen[start]=generation;
        while(head<tail && found<0) {
            int v=queue[head++];
            int candidates[2]={(v+1)%59049,(outside_value(v)+1)%59049};
            for(int e=0;e<2;e++) {
                if(e && getenv("PRELOAD_SEARCH") && binary_flexible[v] && v>tracked_address)continue;
                int t=candidates[e];
                if(seen[t]==generation)continue;
                if(t>=1433 && t<=current_state->last_preinitialized && !(getenv("COMPACT_INIT") && ((t>=1600 && t<4095) || (getenv("SCATTER_INIT") && t>=6500 && t<7775))))continue;
                seen[t]=generation;previous[t]=v;move[t]=e?'j':'o';queue[tail++]=t;
                State check=*current_state;binary_dreg(&check,t);
                if(check.d_reg.module>=0){found=t;break;}
            }
        }
        if(found<0)return -1;
        char path[59049];int length=0;
        for(int v=found;v!=start;v=previous[v])path[length++]=move[v];
        while(length){char one[2]={path[--length],0};ADD_CODE(one);}
        if(current_state->d_reg.module<0)return -1;
        int ret=shortest_set_dreg(normalized_init_code,current_state,pos,max_init_code_length,no_error_printing);
        return ret<0?-1:result+ret;
    }

	if (current_state->d_reg.module == pos->module){
		/* move within the module! */

		do {

			if (current_state->d_reg.pos == pos->pos) {
				/* we did it! */
				return result;
			}

			if (current_state->modules[current_state->d_reg.module].cells[current_state->d_reg.pos].type == CELLTYPE_PTR) {
				if (current_state->modules[current_state->d_reg.module].cells[current_state->d_reg.pos].destination.module == pos->module) {
					if (current_state->modules[current_state->d_reg.module].cells[current_state->d_reg.pos].destination.pos > current_state->d_reg.pos && current_state->modules[current_state->d_reg.module].cells[current_state->d_reg.pos].destination.pos <= pos->pos) {
						/* use abbreviation!!! jmp forward! */
						ADD_CODE("j");
						continue;
					}else if (current_state->modules[current_state->d_reg.module].cells[current_state->d_reg.pos].destination.pos <= pos->pos && current_state->d_reg.pos > pos->pos) {
						/* use backward jmp to reach destination */
						ADD_CODE("j");
						continue;
					}
				}
			}
			ADD_CODE("o");
		}while (current_state->modules[current_state->d_reg.module].num_of_cells >= current_state->d_reg.pos);
		return -1; /* not successful. ran out of module. */

	}else if (current_state->d_reg.module == 0) {
		/* move from module 0 to other module */
		int start_pos = current_state->d_reg.pos;
		int ret;
		do {
			if (current_state->modules[current_state->d_reg.module].cells[current_state->d_reg.pos].type == CELLTYPE_PTR) {
				if (current_state->modules[current_state->d_reg.module].cells[current_state->d_reg.pos].destination.module == pos->module) {
					ADD_CODE("j");
					break;
				}else if (current_state->modules[current_state->d_reg.module].num_of_cells == current_state->d_reg.pos+1) {
					/* last cell of module 0 points back to its beginning */
					ADD_CODE("j");
					continue;
				}
				
			}
			ADD_CODE("o");
		}while (current_state->d_reg.pos != start_pos);
		if (current_state->d_reg.module != pos->module) {
			return -1; /* error! */
		}

		/* move within the module */
		ret = set_dreg(normalized_init_code, current_state, pos, max_init_code_length, no_error_printing);
		if (ret < 0) {
			return -1; /* error */
		}
		return result+ret;

	}else if (pos->module == 0) {
		int ret;
		/* move from other module to module 0: in the current data modules links to modul 0 only exists at their end */
		while (current_state->modules[current_state->d_reg.module].num_of_cells > current_state->d_reg.pos) {
			if (current_state->modules[current_state->d_reg.module].cells[current_state->d_reg.pos].type == CELLTYPE_PTR) {
				if (current_state->modules[current_state->d_reg.module].cells[current_state->d_reg.pos].destination.module == 0) {
					ADD_CODE("j");
					break;
				}
				
			}
			ADD_CODE("o");
		}
		if (current_state->d_reg.module != 0) {
			return -1; /* error! */
		}

		/* move within module 0 */
		ret = set_dreg(normalized_init_code, current_state, pos, max_init_code_length, no_error_printing);
		if (ret < 0) {
			return -1; /* error */
		}
		return result+ret;
	}else{
		/* first move into module 0 */
		int result = set_dreg(normalized_init_code, current_state, pos, max_init_code_length, no_error_printing);
		int result2;
		if (result <= 0) {
			return -1;
		}
		/* then move to destination module */
		result2 = set_dreg(normalized_init_code, current_state, pos, max_init_code_length-result, no_error_printing);
		if (result2 <= 0) {
			return -1;
		}
		return result + result2;
	}
	#undef ADD_CODE
}



/* Exact shortest navigation using only Nop and MovD. No VM changes. */
static int navigate_absolute(char *out, State *state, int target, int cap, int quiet) {
 static unsigned seen[59049],generation;
 static int previous[59049],queue[59049];static char move[59049],path[59049];
 int start=state_address(state);
 if(target==start)return 0;
 ++generation;int head=0,tail=0;queue[tail++]=start;seen[start]=generation;
 while(head<tail && seen[target]!=generation) {
  int p=queue[head++];int cand[2]={(p+1)%59049,(state_value(state,p)+1)%59049};
  for(int e=0;e<2;e++) {
   int t=cand[e];if(seen[t]==generation)continue;
   if(t>=1433 && t<=state->last_preinitialized)continue;
   seen[t]=generation;previous[t]=p;move[t]=e?'j':'o';queue[tail++]=t;
   if(t==target)break;
  }
 }
 if(seen[target]!=generation)return -1;
 int n=0;for(int p=target;p!=start;p=previous[p])path[n++]=move[p];
 if(n>cap)return -1;
 for(int i=0;i<n;i++){char one[2]={path[n-i-1],0};if(add_to_init_code(out+i,state,one,cap-i,quiet)<0)return -1;}
 return n;
}

static int shortest_set_dreg(char *out, State *state, DRegPos *dest, int cap, int quiet) {return navigate_absolute(out,state,module_offsets[dest->module]+dest->pos,cap,quiet);}

int set_dreg_wrapper(char* normalized_init_code, State* current_state, int module, int position, int max_init_code_length, int no_error_printing){
	DRegPos pos;
	DRegPos old_pos;
	int result;
	pos.module = module;
	pos.pos = position;
	old_pos.module = current_state->d_reg.module;
	old_pos.pos = current_state->d_reg.pos;
	result = shortest_set_dreg(normalized_init_code, current_state, &pos, max_init_code_length, no_error_printing);
	if (result >= 0){
		if (current_state->d_reg.module != module || current_state->d_reg.pos != position) {
			if (!no_error_printing) {
				fprintf(stderr,"Internal error: Tried to move D register to %d, %d but it is now at %d, %d.\n",module,position,current_state->d_reg.module,current_state->d_reg.pos);
				fprintf(stderr, "Previous position was %d, %d.\n",old_pos.module,old_pos.pos);
			}
			return -1;
		}
	}
	return result;
}


int get_module_for_constant_generation(int target_value, State* current_state){
	int load_from_module;
	/* select module to generate constant in: */
	if (target_value <= 161)
		load_from_module = 3;
	else if (target_value <= current_state->last_preinitialized)
		load_from_module = 1;
	else
		load_from_module = 2;
	return load_from_module;
}


int load_constant_to_a_reg(char* normalized_init_code, State* current_state, int constant, int load_from_module, int rotations, int crazy_C2_first, int max_init_code_length, int no_error_printing){

	int result = 0;
	#ifndef DOXYGEN
	#define ADD_CODE(code) { int res = add_to_init_code(normalized_init_code, current_state, (code), max_init_code_length, no_error_printing); if (res < 0) return -1; result += res; normalized_init_code += res; max_init_code_length -= res;}
	#define SET_DREG(module, position) {  int res = set_dreg_wrapper(normalized_init_code, current_state, (module), (position), max_init_code_length, no_error_printing); if (res < 0) return -1; result += res; normalized_init_code += res; max_init_code_length -= res;}
	#endif

	int old_val;

	/* load constant into A (maybee generate it first) */ \
	if ((constant) == C1){
		SET_DREG(1,1);
		ADD_CODE("*");
		return result;
	}else if ((constant) == C2) {
		SET_DREG(1,4);
		ADD_CODE("*");
		return result;
	}else if ((constant) == C0) {
		SET_DREG(0,0);
		ADD_CODE("*");
		return result;
	}else if ((constant) == C2-1 || (constant) == C2-2){
		if ((constant) == C2-1) {
			SET_DREG(0,0);
		}else{
			SET_DREG(1,1);
		}
		ADD_CODE("*");
		SET_DREG(1,2);
		ADD_CODE("p");
		return result;
	}

	/* read current constant: stored in cell 3. // TODO: check if cell 3 exists; check type of cell 3! */
	old_val = current_state->modules[load_from_module].cells[3].value;
		
	if (constant == old_val && rotations == 0){
		/* reuse generated constant */
		SET_DREG(load_from_module, 4);
		ADD_CODE("*");
		SET_DREG(load_from_module, 3);
		ADD_CODE("p");
		SET_DREG(load_from_module, 4);
		ADD_CODE("*");
		SET_DREG(load_from_module, 3);
		ADD_CODE("p");
	}else{
		int i;
		/* generate constant! */
		/* 0->1: C2, C20 */
		/* 0->2: C20, C2 */
		/* 1->0: C21, C2 */
		/* 1->2: C20, C2 / C2, C20 */
		/* 2->0: C2, C21 */
		/* 2->1: C2, C20 / C20, C2 */
		int c2_outstanding = crazy_C2_first;
		int currentConstant = constant;

		for (;rotations>10;){
			/* rotate! */
			SET_DREG(load_from_module, 3);
			ADD_CODE("*");
			rotations--;
		}

		for (i=rotations;i<10;i++) {
			currentConstant = rotate_right(currentConstant);
		}

		for (i=10-rotations;i<11;i++){
			unsigned int curBit;
			unsigned int genBit;
			unsigned int useP;
			unsigned int C2_at_beginning = 0;
			int currentCell = current_state->modules[load_from_module].cells[3].value;
			if (c2_outstanding) {
				currentCell = crazy(C2, currentCell);
			}
			curBit = currentCell%3;
			genBit = currentConstant%3;
			currentConstant = rotate_right(currentConstant);
			useP = 2; /* 2: none! */
			if ((curBit == 0 && (genBit == 1 || genBit == 2)) || (curBit == 1 && genBit == 2)  || (curBit == 2 && genBit == 1) )
				useP = 0;
			else if ((curBit == 1 && genBit == 0) || (curBit == 2 && genBit == 0))
				useP = 1;
			if (useP != 2) {
				/* do crazy with C2 if necessary */
				if ((curBit == 0 && genBit == 1) || (curBit == 2 && (genBit == 0))){
					C2_at_beginning = 1;
				}
				if ((curBit == 2 && genBit == 1) || (curBit == 1 && genBit == 2)) {
					C2_at_beginning = c2_outstanding; /* C2 can be done whenever we want. */
					/* we dont want to do it right now. */
				}
				if (C2_at_beginning) {
					if (c2_outstanding) {
						c2_outstanding = 0;
					}else{
						c2_outstanding = 1;
					}
				}
				if (c2_outstanding){
					/* crazy with C2 */
					SET_DREG(load_from_module, 4);
					ADD_CODE("*");
					SET_DREG(load_from_module, 3);
					ADD_CODE("p");
					c2_outstanding = 0;
				}
				/* crazy with C2_useP (C20/C21)! */
				if (useP == 1) {
					SET_DREG(load_from_module, 0);
				}else{
					SET_DREG(load_from_module, 1);
				}
				ADD_CODE("*");
				SET_DREG(load_from_module, 2);
				ADD_CODE("p");
				SET_DREG(load_from_module, 3);
				ADD_CODE("p");
			}
			/* save that a crazy with c2 could be neccessary */ \
			if (curBit != genBit && !C2_at_beginning)
				c2_outstanding = 1;
			/* rotate! */
			if (i < 10) {
				SET_DREG(load_from_module, 3);
				ADD_CODE("*");
			}else
				break;
		}
		if (c2_outstanding) {
			/* crazy with C2 */
			SET_DREG(load_from_module, 4);
			ADD_CODE("*");
			SET_DREG(load_from_module, 3);
			ADD_CODE("p");
			c2_outstanding = 0;
		}
		/**dmod_VALUE = (constant); */
	}
	#undef SET_DREG
	#undef ADD_CODE
	return result;
}


int increment_destination_by_9(char* normalized_init_code, State* current_state, int max_init_code_length, int no_error_printing){

	int result = 0;
	#ifndef DOXYGEN
	#define ADD_CODE(code) { int res = add_to_init_code(normalized_init_code, current_state, (code), max_init_code_length, no_error_printing); if (res < 0) return -1; result += res; normalized_init_code += res; max_init_code_length -= res; }
	#define SET_DREG(module, position) {  int res = set_dreg_wrapper(normalized_init_code, current_state, (module), (position), max_init_code_length, no_error_printing); if (res < 0) return -1; result += res; normalized_init_code += res; max_init_code_length -= res; }
	#endif

	/* read current destination: stored in cell 12. // TODO: check if cell 12 exists; check type of cell 12! */
	int old_dest_val = current_state->modules[0].cells[12].value;

	unsigned int overflow = 0;
	/* clr tmp: ROT C1, CRAZY tmp */
	SET_DREG(0,5);
	ADD_CODE("*");
	SET_DREG(0,6);
	ADD_CODE("p");
	/* ROTR C2 */
	SET_DREG(0,11);
	ADD_CODE("*");
	/* CRAZY destination */
	SET_DREG(0,12);
	ADD_CODE("p");
	/* CRAZY tmp */ \
	SET_DREG(0,6);
	ADD_CODE("p");
	/* CRAZY carry */
	/* get trinary overflow! */
	if ((old_dest_val+9)/27 > old_dest_val/27){
		/* overflow level 1 */
		overflow = 1;
		if ((old_dest_val+9)/81 > old_dest_val/81){
			/* overflow level 2 */
			overflow = 2;
			if ((old_dest_val+9)/(81*3) > old_dest_val/(81*3)){
				/* overflow level 3 */
				overflow = 3;
				if ((old_dest_val+9)/(81*9) > old_dest_val/(81*9)){
					/* overflow level 4 */
					if (!no_error_printing) {
						fprintf(stderr,"Internal error: Carry has not been detected correctly.\nRan into wrong execution path...\n");
					}
					return -1;
				}
			}
		}
	}
	SET_DREG(0,7+3-overflow);
	ADD_CODE("p");
	/* CRAZY destination */
	SET_DREG(0,12);
	ADD_CODE("p");
	#undef SET_DREG
	#undef ADD_CODE
	return result;
}


int denormalize_malbolge(char* normalized_code, int normalized_code_offset, int code_len, int no_error_printing) {
	unsigned int c=normalized_code_offset;
	int i = 0;
	for (i=0;i<code_len;i++) {
		unsigned char in=(unsigned char)(*normalized_code);

		unsigned int instruction = 0;
		switch(in){
			case 'o': instruction = MALBOLGE_COMMAND_NOP; break;
			case 'j': instruction = MALBOLGE_COMMAND_MOVED; break;
			case 'p': instruction = MALBOLGE_COMMAND_OPR; break;
			case '*': instruction = MALBOLGE_COMMAND_ROT; break;
			case 'i': instruction = MALBOLGE_COMMAND_JMP; break;
			case '<': instruction = MALBOLGE_COMMAND_OUT; break;
			case '/': instruction = MALBOLGE_COMMAND_IN; break;
			case 'v': instruction = MALBOLGE_COMMAND_HALT; break;
		}
		if (instruction != 0){
			unsigned int code = ((instruction+94-(c%94))%94);
			if (code < 33)
				code+=94;
			*normalized_code = (char)code;
			c++;
		}else{
			/* blanks, non-normalized symbols and other are not allowed. */
			if (!no_error_printing) {
				fprintf(stderr,"Internal error: Found character: '%c' (%d) at %d during code denormalization.\n",*normalized_code,in,c);
			}
			return 0;
		}
		normalized_code++;
	}
	return 1;
}



#include "transform_cache.h"
static int load_crazy_operand(char *out, State *state, int source, int destination,
                             int capacity, int quiet, int chosen_module) {
    char trial[59050], best[59050]; State best_state;
    int best_cost=INT_MAX;
    if(crazy(state->a_reg,source)==destination)return 0;
    for(int module=1;module<NUM_MODULES;module++) {
        if(state->modules[module].num_of_cells==0)continue;
        if(chosen_module && chosen_module!=module)continue;
        State st=*state; int rotations=10, first=0;
        unsigned int constant=get_best_register_a_value_for_crazy(
            source,destination,st.modules[module].cells[3].value,&rotations,&first);
        if(getenv("TRANSFORM_SEARCH")) {
            State trial_state=*state;
            TransformPlan *plan=transform_plan(source,destination);
            int n=transform_emit(trial,&trial_state,module,plan,capacity);
            if(n>=0 && crazy(trial_state.a_reg,source)==destination && n<best_cost){best_cost=n;best_state=trial_state;memcpy(best,trial,n);}
        }
        if(constant==0xFFFF)continue;
        int cost=load_constant_to_a_reg(trial,&st,constant,module,rotations,first,capacity,1);
        if(cost>=0 && st.a_reg==constant && cost<best_cost) {
            best_cost=cost;best_state=st;memcpy(best,trial,cost);
        }
    }
    if(best_cost==INT_MAX)return -1;
    memcpy(out,best,best_cost);*state=best_state;return best_cost;
}

static int generate_word_strategy(int init_position, int init_value, char* normalized_init_code, State* current_state, int max_init_code_length, int no_error_printing, int force_clear, int module_choice){

	int result = 0;
	#ifndef DOXYGEN
	#define ADD_CODE(code) { int res = add_to_init_code(normalized_init_code, current_state, (code), max_init_code_length, no_error_printing); if (res < 0) return -1; result += res; normalized_init_code += res; max_init_code_length -= res;}
	#define SET_DREG(module, position) {  int res = set_dreg_wrapper(normalized_init_code, current_state, (module), (position), max_init_code_length, no_error_printing); if (res < 0) return -1; result += res; normalized_init_code += res; max_init_code_length -= res; }
	#define LOAD_CONSTANT(constant, module, rotations, crazy_C2_first) {  int res = load_constant_to_a_reg(normalized_init_code, current_state, (constant), (module), (rotations), (crazy_C2_first), max_init_code_length, no_error_printing); if (res < 0) return -1; result += res; normalized_init_code += res; max_init_code_length -= res; }
	#define LOAD_CRAZY(source,dest,module) { int res=load_crazy_operand(normalized_init_code,current_state,(source),(dest),max_init_code_length,no_error_printing,(module)); if(res<0)return -1; result+=res; normalized_init_code+=res; max_init_code_length-=res; }
	#define INCREMENT_BY_9() {  int res = increment_destination_by_9(normalized_init_code, current_state, max_init_code_length, no_error_printing); if (res < 0) return -1; result += res; normalized_init_code += res; max_init_code_length -= res; }
	#endif

	int old_mem_val;
	int constant;
	int rotations=10;
	int crazy_C2_first=0;

	if (current_state == 0 || normalized_init_code == 0 || max_init_code_length < 0 || init_value < 0 || init_value > C2 || current_state->last_preinitialized < 0 || current_state->last_preinitialized > C2 || init_position > C2) {
		/* invalid function parameter(s) */
		if (!no_error_printing) {
			fprintf(stderr,"Internal error: Invalid call of generate_normalized_init_code_for_word function.\n");
		}
		return -1;
	}

	old_mem_val=binary_values[init_position];
    tracked_address=init_position;tracked_value=old_mem_val;

	if (old_mem_val == init_value) {
		/* nothing to do */
		return 0;
	}

	/* - Generate destination address if necessary */
	/* - Test if a constant exists that can be crazied into the destination cell to reach the required value (call getCrazyAValue) */
	/*   - If it does: Generate the constant */
	/*   - Otherwise: Clear the destination memory cell to C1 (by crazying C0 into it), then call getCrazyAValue again and generate the constant */
	/* - Crazy the constant into the destination address */

	/* Test if a completely new destination address has to be generated: */
	if (current_state->modules[0].cells[12].value + 1 > init_position || current_state->modules[0].cells[12].value + 1 + 9 + 9 <= init_position || (current_state->modules[0].cells[12].value)/(3*3*3*3*3*3) < (current_state->modules[0].cells[12].value+9)/(3*3*3*3*3*3)){
		unsigned int constant;
		/* Generate new destination address */
		rotations = 10;
		crazy_C2_first = 0;
		constant = get_best_register_a_value_for_crazy(current_state->modules[0].cells[12].value, ((init_position+59048)%59049), current_state->modules[get_module_for_constant_generation(((init_position+59048)%59049), current_state)].cells[3].value,&rotations,&crazy_C2_first);
		if (constant == 0xFFFF){
			/* bring to C1. */
			SET_DREG(1,1);
			ADD_CODE("*");
			SET_DREG(0,12);
			ADD_CODE("p");
			SET_DREG(0,12);
			ADD_CODE("p");
			rotations = 10;
			crazy_C2_first = 0;
			constant = get_best_register_a_value_for_crazy(current_state->modules[0].cells[12].value, ((init_position+59048)%59049), current_state->modules[get_module_for_constant_generation(((init_position+59048)%59049), current_state)].cells[3].value,&rotations,&crazy_C2_first);
			if (constant == 0xFFFF){
				/* constant is C1, so this could not occur. */
				if (!no_error_printing) {
					fprintf(stderr,"Internal error: Error calculating a value.\n");
				}
				return -1;
			}
		}
		/* use constant generation module to generate value of constant in A-reg */
		LOAD_CRAZY(current_state->modules[0].cells[12].value,((init_position+59048)%59049),0);
		/* crazy A-reg into DESTINATION to get destination address (((init_position+59048)%59049)) */
		SET_DREG(0,12);
		ADD_CODE("p");

	}else if (current_state->modules[0].cells[12].value + 1 + 9 <= init_position) {
		/* incement DESTINATION by 9. */
		INCREMENT_BY_9();
	}

	/* check if data can be stored directly */
	rotations = 10;
	crazy_C2_first = 0;
	constant = get_best_register_a_value_for_crazy(old_mem_val, init_value, current_state->modules[get_module_for_constant_generation(init_value, current_state)].cells[3].value,&rotations,&crazy_C2_first);
	if (constant == 0xFFFF || force_clear){
		/* this is not the case -> bring mem[DESTINATION] 2 C1 by crazying with C0. (mem[init_position] does not contain trits with a value of 2.) */
		/* laod C0 */
		int second_clear=0; for(int bits=old_mem_val;bits;bits/=3)if(bits%3==2)second_clear=1;
        if(second_clear){SET_DREG(1,1);}else{SET_DREG(0,0);}
		ADD_CODE("*");
		/* crazy it into memory cell */
		SET_DREG(0,12);
		ADD_CODE("j");
		while(current_state->d_reg.pos != init_position) {
			ADD_CODE("o");
		}
		ADD_CODE("p");
        if(second_clear){
        SET_DREG(0,12);
        ADD_CODE("j");
        while(current_state->d_reg.pos!=init_position){ADD_CODE("o");}
        ADD_CODE("p");
        }

		old_mem_val = C1;
		rotations = 10;
		crazy_C2_first = 0;
		constant = get_best_register_a_value_for_crazy(old_mem_val, init_value, current_state->modules[get_module_for_constant_generation(init_value, current_state)].cells[3].value,&rotations,&crazy_C2_first);
		if (constant == 0xFFFF){
			/* destination memory cell contains C1, so this could not occur. */
			if (!no_error_printing) {
				fprintf(stderr,"Internal error: Error calculating a value.\n");
			}
			return -1;
		}
	}

	/* generate or reuse constant */
	LOAD_CRAZY(old_mem_val,init_value,module_choice);
	/* crazy constant into memory cell */
	SET_DREG(0,12);
	ADD_CODE("j");
	while(current_state->d_reg.pos != init_position) {
		ADD_CODE("o");
	}
	ADD_CODE("p");

	current_state->a_reg=init_value;
	return result;

	#undef LOAD_CRAZY
	#undef INCREMENT_BY_9
	#undef LOAD_CONSTANT
	#undef SET_DREG
	#undef ADD_CODE
}




int generate_normalized_init_code_for_word_with_module_system(int pos, int val,
        char *out, State *state, int cap, int quiet) {
    char trial[59050],best[59050]; State best_state; int best_cost=INT_MAX;
    for(int strategy=0;strategy<2;strategy++) {
        State st=*state;
        int cost=generate_word_strategy(pos,val,trial,&st,cap,1,strategy,0);
        if(cost>=0 && cost<best_cost){best_cost=cost;best_state=st;memcpy(best,trial,cost);}
    }
    if(best_cost==INT_MAX){State st=*state;fprintf(stderr,"Word failed %d => %d, old %d\n",pos,val,binary_values[pos]);generate_word_strategy(pos,val,out,&st,cap,0,0,0);return -1;}
    memcpy(out,best,best_cost);*state=best_state;return best_cost;
}

static int generate_direct_word(int pos,int val,char *out,State *state,int cap,int clear,int module) {
    if(state->modules[module].num_of_cells==0)return -1;
    int old=binary_values[pos],n=0;tracked_address=pos;tracked_value=old;
    if(old==val)return 0;
    #define DIRECT_NAV() {int r=navigate_absolute(out+n,state,pos,cap-n,1);if(r<0)return -1;n+=r;}
    #define DIRECT_SET(m,p) {int r=set_dreg_wrapper(out+n,state,m,p,cap-n,1);if(r<0)return -1;n+=r;}
    #define DIRECT_ADD(c) {int r=add_to_init_code(out+n,state,c,cap-n,1);if(r<0)return -1;n+=r;}
    if(clear>=2) {
        if(clear==2){DIRECT_SET(0,0);DIRECT_ADD("*");}
        DIRECT_NAV();DIRECT_ADD("p");
        old=tracked_value;
        if(get_register_a_value_for_crazy(old,val,state->a_reg)==0xFFFF)return -1;
    } else if(clear || get_register_a_value_for_crazy(old,val,state->a_reg)==0xFFFF) {
        int two=0;for(int x=old;x;x/=3)if(x%3==2)two=1;
        DIRECT_SET(1,two?1:0);DIRECT_ADD("*");DIRECT_NAV();DIRECT_ADD("p");
        if(two){DIRECT_NAV();DIRECT_ADD("p");}
        old=C1;
    }
    int r=load_crazy_operand(out+n,state,old,val,cap-n,1,module);if(r<0)return -1;n+=r;
    DIRECT_NAV();DIRECT_ADD("p");
    #undef DIRECT_NAV
    #undef DIRECT_SET
    #undef DIRECT_ADD
    return n;
}
int generate_word_choice(int pos,int val,char *out,State *state,int cap,int choice) {
    int modules=NUM_MODULES-1;
    if(choice>=2*modules)return generate_direct_word(pos,val,out,state,cap,choice/modules-2,choice%modules+1);
    return generate_word_strategy(pos,val,out,state,cap,1,choice/modules,choice%modules+1);
}

int generate_jump_to_entrypoint_with_module_system(int entry_point, char* normalized_init_code, State* cur_state, int max_init_code_length, int no_error_printing){

	int init_position = entry_point;
	int result = 0;
	#ifndef DOXYGEN
	#define ADD_CODE(code) { int res = add_to_init_code(normalized_init_code, cur_state, (code), max_init_code_length, no_error_printing); if (res < 0) return -1; result += res; normalized_init_code += res; max_init_code_length -= res;}
	#define SET_DREG(module, position) {  int res = set_dreg_wrapper(normalized_init_code, cur_state, (module), (position), max_init_code_length, no_error_printing); if (res < 0) return -1; result += res; normalized_init_code += res; max_init_code_length -= res; }
	#define LOAD_CONSTANT(constant, module, rotations, crazy_C2_first) {  int res = load_constant_to_a_reg(normalized_init_code, cur_state, (constant), (module), (rotations), (crazy_C2_first), max_init_code_length, no_error_printing); if (res < 0) return -1; result += res; normalized_init_code += res; max_init_code_length -= res; }
	#define INCREMENT_BY_9() {  int res = increment_destination_by_9(normalized_init_code, cur_state, max_init_code_length, no_error_printing); if (res < 0) return -1; result += res; normalized_init_code += res; max_init_code_length -= res; }
	#endif

	int rotations=10;
	int crazy_C2_first=0;

	if (cur_state == 0 || normalized_init_code == 0 || max_init_code_length < 0 || cur_state->last_preinitialized < 0 || cur_state->last_preinitialized > C2 || init_position > C2) {
		/* invalid function parameter(s) */
		if (!no_error_printing) {
			fprintf(stderr,"Internal error: Invalid call of generate_normalized_init_code_for_word function.\n");
		}
		return -1;
	}


	/* - Generate destination address */
	/* - Jump to destination address */

	/* Test if a completely new destination address has to be generated: */
	if (cur_state->modules[0].cells[12].value + 1 > init_position || cur_state->modules[0].cells[12].value + 1 + 9 + 9 <= init_position || (cur_state->modules[0].cells[12].value)/(3*3*3*3*3*3) < (cur_state->modules[0].cells[12].value+9)/(3*3*3*3*3*3)){
		/* Generate new destination address */
		unsigned int constant = get_best_register_a_value_for_crazy(cur_state->modules[0].cells[12].value, ((init_position+59048)%59049), cur_state->modules[get_module_for_constant_generation(((init_position+59048)%59049), cur_state)].cells[3].value,&rotations,&crazy_C2_first);
		if (constant == 0xFFFF){
			/* bring to C1. */
			SET_DREG(1,1);
			ADD_CODE("*");
			SET_DREG(0,12);
			ADD_CODE("p");
			SET_DREG(0,12);
			ADD_CODE("p");
			rotations=10;
			crazy_C2_first=0;
			constant = get_best_register_a_value_for_crazy(cur_state->modules[0].cells[12].value, ((init_position+59048)%59049), cur_state->modules[get_module_for_constant_generation(((init_position+59048)%59049), cur_state)].cells[3].value,&rotations,&crazy_C2_first);
			if (constant == 0xFFFF){
				/* constant is C1, so this could not occur. */
				if (!no_error_printing) {
					fprintf(stderr,"Internal error: Error calculating a value.\n");
				}
				return -1;
			}
		}
		/* use constant generation module to generate value of constant in A-reg */
		LOAD_CONSTANT(constant, get_module_for_constant_generation(((init_position+59048)%59049), cur_state), rotations, crazy_C2_first);

		/* crazy A-reg into DESTINATION to get destination address (((init_position+59048)%59049)) */
		SET_DREG(0,12);
		ADD_CODE("p");
	}else if (cur_state->modules[0].cells[12].value + 1 + 9 <= init_position) {
		/* incement DESTINATION by 9. */
		INCREMENT_BY_9();
	}

	/* go to destination address */
	SET_DREG(0,12);
	ADD_CODE("j");
	if (cur_state->d_reg.module >= 0) {
		if (!no_error_printing) {
			fprintf(stderr,"Internal error: Not at memoy cell!\n");
		}
		return -1;
	}
	while(cur_state->d_reg.pos != init_position) {
		ADD_CODE("o");
	}

	return result;

	#undef INCREMENT_BY_9
	#undef LOAD_CONSTANT
	#undef SET_DREG
	#undef ADD_CODE
}

