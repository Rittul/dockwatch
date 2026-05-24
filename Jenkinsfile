pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'dockwatch'  // ← forces same project name as host
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Containers') {
            steps {
                sh 'docker compose build frontend monitoring-service logs-service'
            }
        }

        stage('Deploy Containers') {
            steps {
                sh 'docker compose up -d --no-deps frontend monitoring-service logs-service'
            }
        }

        stage('Verify') {
            steps {
                sh 'docker compose ps'
            }
        }
    }

    post {
        failure {
            sh 'docker compose logs --tail=50'
        }
    }
}