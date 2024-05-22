#!/bin/bash
images=$(kubeadm config images list --config init-config.yaml | awk -F'/' '{print $NF}')
for i in ${images}
do
   docker pull registry.aliyuncs.com/google_containers/$i
   docker tag registry.aliyuncs.com/google_containers/$i $1/google_containers/$i
   docker push $1/google_containers/$i
   docker rmi $1/$i
   docker rmi registry.aliyuncs.com/google_containers/$i
done