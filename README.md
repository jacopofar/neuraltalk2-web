# neuraltalk2-web
[Neuraltalk2](https://github.com/karpathy/neuraltalk2) is a fantastic tool based on Torch which uses neural networks to automatically caption images.

This repository offers a Dockerfile to run immediately the program without having to manually install the dependencies.

Coming soon: a web interface to load images and get a caption, probably a REST one to expose captioning as a web service.

Does it use GPUs?
------------------

Unfortunately not. Although neuraltalk2 can use GPU I don't have the proper hardware to test it and so the Docker image runs only on CPU. It should be pretty easy to implement, so if you have the will to test the Docker image on your GPU don't hesitate to open issues or make pull requests.

How to use
==========

Linux
-----

You only need Docker, so run as root

    curl -sSL https://get.docker.com/ | sh

It's better to restart your machine aftwerwards.

Then run

    docker run -it -v /home/myuser/:/mounted jacopofar/neuraltalk2:latest bash

assuming ‘/home/myuser/‘ contains both the neuraltalk2 model and the images to caption.

This will open a shell on the container. Use ‘cd /neuraltalk2/‘ to be in the neuraltalk folder and then

    th eval.lua -model /mounted/natural2models/model_id1-501-1448236541.t7_cpu.t7 -image_folder /mounted/Desktop/ -gpuid -1

will caption the images in the given folder using the given model. The captions are saved in the vis/vis.json file.

Windows or Mac OS
-----------------

You will need a VM with Linux, or just install docker-machine and let it create that for you.

The default memory of 1GB is not enough, so give it more:

    docker-machine create -d virtualbox --virtualbox-memory "4000" neuraltalk2
    eval "$(docker-machine env natural2)"

Then use the same instructions as Linux, but note that:
* VMs usually do not have access to host GPUs
* docker-machine mounts the user folder on the VM filesystem, and that's the path you need to give ‘docker run‘
* The VM will have its own IP address, so use ‘docker-machine ssh neuraltalk2‘ to SSH in it and ‘docker-machine ip‘ to know its IP
