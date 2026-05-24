pipeline {
    agent any

    environment {
        EC2_HOST = 'ubuntu@44.200.228.44'
    }

    stages {

        stage('Clone Repository') {
            steps {
                checkout scm
            }
        }

        stage('Docker Login') {
            steps {
                withCredentials([
                    [$class: 'UsernamePasswordMultiBinding',
                    credentialsId: 'dockerhub',
                    usernameVariable: 'DOCKERHUB_USERNAME',
                    passwordVariable: 'DOCKERHUB_TOKEN']
                ]) {
                    bat '''
                    echo %DOCKERHUB_TOKEN% | docker login -u %DOCKERHUB_USERNAME% --password-stdin
                    '''
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                withCredentials([
                    [$class: 'UsernamePasswordMultiBinding',
                    credentialsId: 'dockerhub',
                    usernameVariable: 'DOCKERHUB_USERNAME',
                    passwordVariable: 'DOCKERHUB_TOKEN']
                ]) {
                    bat '''
                    docker build -t %DOCKERHUB_USERNAME%/micro-chat-auth-service:latest ./services/auth-service
                    docker build -t %DOCKERHUB_USERNAME%/micro-chat-chat-service:latest ./services/chat-service
                    docker build -t %DOCKERHUB_USERNAME%/micro-chat-notification-service:latest ./services/notification-service
                    docker build -t %DOCKERHUB_USERNAME%/micro-chat-gateway:latest ./gateway
                    docker build -t %DOCKERHUB_USERNAME%/micro-chat-client:latest ./client
                    '''
                }
            }
        }

        stage('Push Docker Images') {
            steps {
                withCredentials([
                    [$class: 'UsernamePasswordMultiBinding',
                    credentialsId: 'dockerhub',
                    usernameVariable: 'DOCKERHUB_USERNAME',
                    passwordVariable: 'DOCKERHUB_TOKEN']
                ]) {
                    bat '''
                    docker push %DOCKERHUB_USERNAME%/micro-chat-auth-service:latest
                    docker push %DOCKERHUB_USERNAME%/micro-chat-chat-service:latest
                    docker push %DOCKERHUB_USERNAME%/micro-chat-notification-service:latest
                    docker push %DOCKERHUB_USERNAME%/micro-chat-gateway:latest
                    docker push %DOCKERHUB_USERNAME%/micro-chat-client:latest
                    '''
                }
            }
        }

        stage('Deploy to AWS EC2') {
            steps {
                sshagent(credentials: ['aws-key']) {
                    bat '''
                    scp -o StrictHostKeyChecking=no docker-compose.prod.yml %EC2_HOST%:~/docker-compose.prod.yml
                    '''

                    bat """
                    ssh -o StrictHostKeyChecking=no %EC2_HOST% "docker compose -f docker-compose.prod.yml down --remove-orphans || true && docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d && docker image prune -af || true"
                    """
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    def host = env.EC2_HOST.split('@')[1]
                    bat """
                    curl -f http://${host}:5000/
                    """
                }
            }
        }
    }

    post {
        success {
            echo 'Deployment Successful'
        }
        failure {
            echo 'Deployment Failed'
        }
    }
}