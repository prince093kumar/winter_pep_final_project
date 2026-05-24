pipeline {
    agent any
    
    triggers {
        pollSCM('H/5 * * * *')
    }
    
    environment {
        // AWS EC2 Details
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
        
        stage('Build & Push Docker Images') {
            steps {
                withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'dockerhub', passwordVariable: 'DOCKERHUB_TOKEN', usernameVariable: 'DOCKERHUB_USERNAME']]) {
                    sh 'echo $DOCKERHUB_TOKEN | docker login -u $DOCKERHUB_USERNAME --password-stdin'
                    
                    sh "docker build -t ${DOCKERHUB_USERNAME}/micro-chat-auth-service:latest ./services/auth-service"
                    sh "docker build -t ${DOCKERHUB_USERNAME}/micro-chat-chat-service:latest ./services/chat-service"
                    sh "docker build -t ${DOCKERHUB_USERNAME}/micro-chat-notification-service:latest ./services/notification-service"
                    sh "docker build -t ${DOCKERHUB_USERNAME}/micro-chat-gateway:latest ./gateway"
                    sh "docker build -t ${DOCKERHUB_USERNAME}/micro-chat-client:latest ./client"
                    
                    sh "docker push ${DOCKERHUB_USERNAME}/micro-chat-auth-service:latest"
                    sh "docker push ${DOCKERHUB_USERNAME}/micro-chat-chat-service:latest"
                    sh "docker push ${DOCKERHUB_USERNAME}/micro-chat-notification-service:latest"
                    sh "docker push ${DOCKERHUB_USERNAME}/micro-chat-gateway:latest"
                    sh "docker push ${DOCKERHUB_USERNAME}/micro-chat-client:latest"
                }
            }
        }
        
        stage('Deploy to AWS EC2') {
            steps {
                echo 'Deploying application to AWS EC2...'
                withCredentials([
                    [$class: 'SSHUserPrivateKeyBinding', credentialsId: 'aws-key', keyFileVariable: 'SSH_KEY', usernameVariable: 'SSH_USER'],
                    [$class: 'UsernamePasswordMultiBinding', credentialsId: 'dockerhub', passwordVariable: 'DOCKERHUB_TOKEN', usernameVariable: 'DOCKERHUB_USERNAME']
                ]) {
                    sh "scp -o StrictHostKeyChecking=no -i $SSH_KEY docker-compose.prod.yml ${EC2_HOST}:~/docker-compose.prod.yml"
                    
                    sh """ssh -o StrictHostKeyChecking=no -i $SSH_KEY ${EC2_HOST} << EOF
                        export DOCKERHUB_USERNAME=${DOCKERHUB_USERNAME}
                        docker-compose -f docker-compose.prod.yml down --remove-orphans || true
                        docker-compose -f docker-compose.prod.yml pull
                        docker-compose -f docker-compose.prod.yml up -d
                        docker image prune -af || true
EOF"""
                }
            }
        }
        
        stage('Cluster Health Check') {
            steps {
                echo 'Running health checks...'
                script {
                    def host = env.EC2_HOST.split('@')[1]
                    int retries = 5
                    boolean healthy = false
                    
                    while (retries > 0 && !healthy) {
                        try {
                            sh "curl -f http://${host}:5000/ > /dev/null"
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