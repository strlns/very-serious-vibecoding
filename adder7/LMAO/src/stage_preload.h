static int stage_scan(int start,int end,int *program,char *code,State *state,int capacity) {
    int n=generate_jump_to_entrypoint_with_module_system(start,code,state,capacity,1);
    if(n<0 || code[n-1]!='j')return -1;
    int a=state->a_reg;
    for(int p=start;p<end;p++) {
        int best=1000000,chosen=-1,old=0;
        for(int raw=33;raw<=126;raw++)if(is_valid_initial_character(p%94,raw)) {
            int value=crazy(a,raw),score=0;
            if(program[p]>=0) {
                int v=program[p],canonical=0,power=1;
                for(int t=0,n=v;t<10;t++,n/=3,power*=3)canonical+=(n%3==0?1:(n%3==1?0:2))*power;
                unsigned operand=get_register_a_value_for_crazy(value,v,canonical);
                if(operand==0xFFFF)score+=100;
                else for(int t=0,b=operand,c=canonical;t<10;t++,b/=3,c/=3)score+=(b%3!=c%3);
                if(value==v)score-=1000;
            }
            if(score<best){best=score;chosen=raw;old=value;}
        }
        if(chosen<0 || n>=capacity)return -1;
        binary_raw[p]=chosen;binary_values[p]=old;binary_flexible[p]=0;
        code[n++]='p';a=old;
    }
    state->a_reg=a;state->d_reg.module=-1;state->d_reg.pos=end;
    return n;
}
