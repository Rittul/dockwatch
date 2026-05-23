pipeline {

    agent any

    stages {

        stage('Clone Repository') {

            steps {

                git 'https://github.com/Rittul/dockwatch.git'
            }
        }

        stage('Build Containers') {

            steps {

                sh 'docker compose build'
            }
        }

        stage('Deploy Containers') {

            steps {

                sh 'docker compose up -d'
            }
        }
    }
}