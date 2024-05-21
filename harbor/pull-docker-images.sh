imageFile="./docker-images.txt"
if[!-f"$imagesFile];then
    images=$(cat docker-images.txt)
    for i in ${images}
    do
      docker pull $i
      docker tag $i $1/$i
      docker push $1/$i
      docker rmi $1/$i
      docker rmi $i
    done
else 
  echo "docker-images.txt文件不存在"
fi
