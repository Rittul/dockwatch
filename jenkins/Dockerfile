FROM jenkins/jenkins:lts

USER root

RUN apt update && \
    apt install -y docker.io docker-compose

USER jenkins