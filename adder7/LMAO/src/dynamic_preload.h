static int preload_allowed(int address,int value) {
    return value>=33 && value<=126 && is_valid_initial_character(address%94,value);
}
static int preload_options(int address,int value,State *state,int *options) {
    int count=1;options[0]=binary_values[address];
    if(!getenv("PRELOAD_SEARCH") || !binary_flexible[address])return count;
    for(int raw=33;raw<=126;raw++)if(raw!=options[0] && preload_allowed(address,raw))options[count++]=raw;
    return count;
}
