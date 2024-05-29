File="./array.txt"
if [ !-f"$File" ] ;then
    dep=$(cat array.txt)
    for i in ${dep}
    do
      npm i $i
    done
else 
  echo "array.txt文件不存在"
fi