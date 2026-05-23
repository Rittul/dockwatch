pipeline {

    agent any

    stages {

        stage('Build Containers') {

            steps {

                sh 'docker-compose build'
            }
        }

        stage('Deploy Containers') {

            steps {

                sh 'docker-compose up -d'
            }
        }
    }
}