#include <stdio.h>
#include <stdlib.h>
static int crazy(int a,int b){
 int tab[9]={1,0,0,1,0,2,2,2,1},r=0,p=1;
 for(int i=0;i<10;i++){r+=tab[a%3+3*(b%3)]*p;p*=3;a/=3;b/=3;}return r;
}
int main(int argc,char**argv){
 int m[59049],a=0,c=-1,d;
 unsigned char bytes[60000];
 FILE*f=fopen(argv[1],"rb");if(!f)return 2;
 int length=fread(bytes,1,sizeof(bytes),f);fclose(f);int used=0;
 for(int i=0;i<length;i++) {
  int ch=bytes[i];if(ch==9||ch==10||ch==11||ch==12||ch==13||ch==32)continue;
  if(used>=59049)return 6;
  if(ch<33||ch>126)return 7;
  {int op=(ch+used)%94;if(op!=4&&op!=5&&op!=23&&op!=39&&op!=40&&op!=62&&op!=68&&op!=81)return 7;}
  m[used++]=ch;
 }
 if(used<2)return 8;
 for(int k=used;k<59049;k++)m[k]=crazy(m[k-1],m[k-2]);
 c=0;d=0;
 const char*x="5z]&gqtyfr$(we4{WP)H-Zn,[%\\3dL+Q;>U!pJS72FhOA1CB6v^=I_0/8|jsb9m<.TVac`uY*MK'X~xDl}REokN:#?G\"i@";
 for(unsigned long long n=0;n<10000000000ULL;n++){
  if(m[c]<33||m[c]>126){fprintf(stderr,"invalid code %d at %d step %llu\n",m[c],c,n);return 3;}
  switch((m[c]+c)%94){
  case 4:c=m[d];break;
  case 5:putchar(a%256);break;
  case 23:a=getchar();if(a==EOF)a=59048;break;
  case 39:a=m[d]=m[d]/3+(m[d]%3)*19683;break;
  case 40:d=m[d];break;
  case 62:a=m[d]=crazy(a,m[d]);break;
  case 81:return 0;
  }
  if(m[c]<33||m[c]>126){fprintf(stderr,"invalid encryption at %d\n",c);return 4;}
  m[c]=x[m[c]-33];c=(c+1)%59049;d=(d+1)%59049;
 }
 fprintf(stderr,"step limit\n");return 5;
}
