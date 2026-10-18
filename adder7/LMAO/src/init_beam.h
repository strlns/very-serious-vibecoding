int generate_word_choice(int,int,char*,State*,int,int);
#define BEAM_WIDTH (getenv("INIT_BEAM_WIDTH")?atoi(getenv("INIT_BEAM_WIDTH")):12)
#include "dynamic_preload.h"
struct InitBeam { State state; int length; char code[59050]; unsigned char raw[59049]; };
static int generate_init_beam(int *program,int first,char *out,State *state,int capacity) {
    struct InitBeam *beam=calloc(BEAM_WIDTH,sizeof(*beam));
    struct InitBeam *next=calloc(BEAM_WIDTH,sizeof(*next));
    char piece[4096];
    int count=1;
    int code_base=59049-capacity;
    int jumped=getenv("STAGE_PRELOAD")!=NULL;
    beam[0].state=*state;memcpy(beam[0].raw,binary_raw,59049);
    for(int address=first;address<=C2;address++) {
        if(program[address]<0)continue;
        int ncount=0;
        int baseline=binary_values[address];
        for(int parent=0;parent<count;parent++) {
          binary_values[address]=baseline;
          int raw_options[8],raw_count=preload_options(address,program[address],&beam[parent].state,raw_options);
          for(int r=0;r<raw_count;r++)for(int choice=0;choice<6*(NUM_MODULES-1);choice++) {
            binary_values[address]=raw_options[r];
            State st=beam[parent].state;
            int cap=capacity-beam[parent].length;
            if(cap>4096)cap=4096;
            int n=generate_word_choice(address,program[address],piece,&st,cap,choice);
            if(n<0)continue;
            int cost=beam[parent].length+n;
            int duplicate=-1;
            for(int j=0;j<ncount;j++)if(!memcmp(&next[j].state,&st,sizeof(st))){duplicate=j;break;}
            if(duplicate>=0 && next[duplicate].length<=cost)continue;
            if(duplicate>=0){memmove(next+duplicate,next+duplicate+1,(ncount-duplicate-1)*sizeof(*next));ncount--;}
            int at=0;while(at<ncount && next[at].length<=cost)at++;
            if(at>=BEAM_WIDTH)continue;
            int end=ncount<BEAM_WIDTH?ncount:BEAM_WIDTH-1;
            if(end>at)memmove(next+at+1,next+at,(end-at)*sizeof(*next));
            next[at].state=st;next[at].length=cost;
            memcpy(next[at].code,beam[parent].code,beam[parent].length);
            memcpy(next[at].code+beam[parent].length,piece,n);
            memcpy(next[at].raw,beam[parent].raw,59049);if(binary_flexible[address])next[at].raw[address]=raw_options[r];
            if(ncount<BEAM_WIDTH)ncount++;
          }
        }
        binary_values[address]=baseline;
        if(!ncount){if(getenv("INIT_STATS"))fprintf(stderr,"No room at address %d, best prior size %d\n",address,beam[0].length);free(beam);free(next);return -1;}
        if(getenv("SCATTER_INIT") && !jumped && next[0].length+code_base>=6000) {
            for(int j=0;j<ncount;j++) {
                int n=generate_jump_to_entrypoint_with_module_system(7776,piece,&next[j].state,sizeof(piece),1);
                if(n<=0 || piece[n-1]!='j' || code_base+next[j].length+n>6500){free(beam);free(next);return -1;}
                piece[n-1]='i';next[j].state.d_reg.module=0;next[j].state.d_reg.pos=13;
                memcpy(next[j].code+next[j].length,piece,n);next[j].length+=n;
                while(next[j].length+code_base<6500)next[j].code[next[j].length++]='o';
                memcpy(next[j].code+next[j].length,binary_raw+6500,7776-6500);
                next[j].length+=7776-6500;
            }
            jumped=1;
        }
        if(getenv("WORD_LOG"))fprintf(stderr,"W %d %d %d %d\n",address,program[address],baseline,next[0].length);
        binary_values[address]=program[address];
        struct InitBeam *swap=beam;beam=next;next=swap;count=ncount;
    }
    int result=beam[0].length;
    memcpy(out,beam[0].code,result);*state=beam[0].state;
    memcpy(binary_raw,beam[0].raw,59049);
    free(beam);free(next);return result;
}
