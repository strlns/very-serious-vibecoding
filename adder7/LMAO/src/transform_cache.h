/* Shortest constant transformations, with multiple acceptable accumulator values. */
#define TRANSFORM_CACHE_SIZE 128
typedef struct {int source,destination;unsigned short distance[59049];unsigned char action[59049];} TransformPlan;
static TransformPlan *plan_cache[TRANSFORM_CACHE_SIZE];
static int plan_count,plan_replace;
static int reverse_head[59049],reverse_next[236196],reverse_from[236196];
static unsigned char reverse_action[236196];
static int reverse_ready;
static int transform_value(int v,int op) {
 if(op==0)return rotate_right(v);
 return crazy(op==1?C2:op==2?C2-1:C2-2,v);
}
static TransformPlan *transform_plan(int source,int destination) {
 for(int k=0;k<plan_count;k++)if(plan_cache[k]->source==source && plan_cache[k]->destination==destination)return plan_cache[k];
 if(!reverse_ready) {
  for(int k=0;k<59049;k++)reverse_head[k]=-1;
  int e=0;for(int v=0;v<59049;v++)for(int op=0;op<4;op++,e++) {
   int w=transform_value(v,op);reverse_from[e]=v;reverse_action[e]=op;reverse_next[e]=reverse_head[w];reverse_head[w]=e;
  }
  reverse_ready=1;
 }
 TransformPlan *p;
 if(plan_count<TRANSFORM_CACHE_SIZE){p=malloc(sizeof(*p));plan_cache[plan_count++]=p;}
 else {p=plan_cache[plan_replace];plan_replace=(plan_replace+1)%TRANSFORM_CACHE_SIZE;}
 p->source=source;p->destination=destination;
 for(int k=0;k<59049;k++){p->distance[k]=65535;p->action[k]=255;}
 static int qnode[400000],qnext[400000],qcost[400000];
 int head[3]={-1,-1,-1},entries=0,pending=0;
 #define ENQUEUE(v,c) {int z=(c)%3;qnode[entries]=(v);qcost[entries]=(c);qnext[entries]=head[z];head[z]=entries++;pending++;if(entries>=400000){fprintf(stderr,"transform queue capacity\n");exit(2);}}
 for(int v=0;v<59049;v++)if(crazy(v,source)==destination){p->distance[v]=0;ENQUEUE(v,0);}
 int cost=0;
 while(pending) {
  while(head[cost%3]<0)cost++;
  int entry=head[cost%3];head[cost%3]=qnext[entry];pending--;
  int v=qnode[entry];if(qcost[entry]!=p->distance[v])continue;
  for(int e=reverse_head[v];e>=0;e=reverse_next[e]) {
   int u=reverse_from[e],op=reverse_action[e],d=cost+(op<2?1:2);
   if(d<p->distance[u]){p->distance[u]=d;p->action[u]=op;ENQUEUE(u,d);}
  }
 }
 #undef ENQUEUE
 return p;
}
static int transform_emit(char *out,State *s,int module,TransformPlan *p,int cap) {
 int n=0,step=0;
 #define NAV(pos) {int r=set_dreg_wrapper(out+n,s,module,(pos),cap-n,1);if(r<0)return -1;n+=r;}
 #define EMIT(code) {int r=add_to_init_code(out+n,s,(code),cap-n,1);if(r<0)return -1;n+=r;}
 if(p->distance[s->modules[module].cells[3].value]==65535)return -1;
 if(p->action[s->modules[module].cells[3].value]==255) {
  NAV(4);EMIT("*");NAV(3);EMIT("p");NAV(4);EMIT("*");NAV(3);EMIT("p");
 }
 while(p->action[s->modules[module].cells[3].value]!=255) {
  if(++step>100)return -1;
  int op=p->action[s->modules[module].cells[3].value];
  if(op==0){NAV(3);EMIT("*");}
  else if(op==1){NAV(4);EMIT("*");NAV(3);EMIT("p");}
  else {NAV(op==2?0:1);EMIT("*");NAV(2);EMIT("p");NAV(3);EMIT("p");}
 }
 #undef NAV
 #undef EMIT
 return n;
}
