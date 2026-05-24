pipeline {
    agent any

    triggers {
        pollSCM('H/5 * * * *')
    }

    environment {
        EC2_HOST = 'ubuntu@32.192.25.114'
        COMPOSE_PROJECT_NAME = 'chat_app'
    }

    stages {

        stage('Clone Repository') {
            steps {
                echo 'Cloning GitHub repository...'
                checkout scm
            }
        }

        stage('Docker Login') {
            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub',
                        usernameVariable: 'DOCKERHUB_USERNAME',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
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
                    usernamePassword(
                        credentialsId: 'dockerhub',
                        usernameVariable: 'DOCKERHUB_USERNAME',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
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
                    usernamePassword(
                        credentialsId: 'dockerhub',
                        usernameVariable: 'DOCKERHUB_USERNAME',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
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

                withCredentials([

                    sshUserPrivateKey(
                        credentialsId: 'aws-key',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    ),

                    usernamePassword(
                        credentialsId: 'dockerhub',
                        usernameVariable: 'DOCKERHUB_USERNAME',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )

                ]) {

                    bat '''
                    scp -o StrictHostKeyChecking=no -i "%SSH_KEY%" docker-compose.prod.yml %EC2_HOST%:~/docker-compose.prod.yml
                    '''

                    bat '''
                    ssh -o StrictHostKeyChecking=no -i "%SSH_KEY%" %EC2_HOST% ^
                    "docker compose -f docker-compose.prod.yml down --remove-orphans || true && ^
                    docker compose -f docker-compose.prod.yml pull && ^
                    docker compose -f docker-compose.prod.yml up -d && ^
                    docker image prune -af || true"
                    '''
                }
            }
        }

        stage('Cluster Health Check') {
            steps {

                script {

                    def host = env.EC2_HOST.split('@')[1]

                    int retries = 5
                    boolean healthy = false

                    while (retries > 0 && !healthy) {

                        try {

                            bat """
                            curl -f http://${host}:5000/
                            """

                            echo 'Application is healthy.'
                            healthy = true

                        } catch (Exception e) {

                            echo "Health check failed. Retrying in 10 seconds... (${retries} attempts left)"

                            sleep 10
                            retries--
                        }
                    }

                    if (!healthy) {
                        error 'Deployment failed: Health checks timed out.'
                    }
                }
            }
        }
    }

    post {

        success {
            echo 'CI/CD Pipeline completed successfully.'
        }

        failure {
            echo 'CI/CD Pipeline failed.'
        }
    }
}