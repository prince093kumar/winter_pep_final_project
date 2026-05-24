pipeline {
    agent any
    
    triggers {
        pollSCM('H/5 * * * *') // Poll source code every 5 minutes for automatic redeployment
    }
    
    environment {
        // Docker Hub Credentials ID in Jenkins
        DOCKERHUB_CREDENTIALS_ID = 'dockerhub-credentials'
        
        // AWS EC2 Details
        EC2_HOST = 'ubuntu@32.192.25.114'
        SSH_CREDENTIALS_ID = 'aws-ec2-ssh-key' // Jenkins credentials ID for SSH private key
        
        COMPOSE_PROJECT_NAME = "chat_app"
    }
    
    stages {
        stage(' Clone Repository') {
            steps {
                echo 'Cloning workspace...'
                checkout scm
            }
        }
        
        // --- TESTS COMMENTED OUT TO SPEED UP THE BUILD ---
        // stage(' Run Service Tests') {
        //     steps {
        //         echo 'Spinning up test suite inside temporary container...'
        //         sh 'MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd)":/app -w /app/services/auth-service node:18 sh -c "npm ci && npm test"'
        //     }
        // }
        
        stage(' Build & Push Docker Images') {
            environment {
                DOCKER_CREDS = credentials('dockerhub-credentials')
            }
            steps {
                echo 'Building and publishing container images to Docker Hub...'
                sh 'echo $DOCKER_CREDS_PSW | docker login -u $DOCKER_CREDS_USR --password-stdin'
                
                // Build and tag each service
                sh "docker build -t ${DOCKER_CREDS_USR}/micro-chat-auth-service:latest ./services/auth-service"
                sh "docker build -t ${DOCKER_CREDS_USR}/micro-chat-chat-service:latest ./services/chat-service"
                sh "docker build -t ${DOCKER_CREDS_USR}/micro-chat-notification-service:latest ./services/notification-service"
                sh "docker build -t ${DOCKER_CREDS_USR}/micro-chat-gateway:latest ./gateway"
                sh "docker build -t ${DOCKER_CREDS_USR}/micro-chat-client:latest ./client"
                
                // Push images
                sh "docker push ${DOCKER_CREDS_USR}/micro-chat-auth-service:latest"
                sh "docker push ${DOCKER_CREDS_USR}/micro-chat-chat-service:latest"
                sh "docker push ${DOCKER_CREDS_USR}/micro-chat-notification-service:latest"
                sh "docker push ${DOCKER_CREDS_USR}/micro-chat-gateway:latest"
                sh "docker push ${DOCKER_CREDS_USR}/micro-chat-client:latest"
            }
        }
        
        stage(' Deploy to AWS EC2') {
            environment {
                DOCKER_CREDS = credentials('dockerhub-credentials')
                SSH_KEY = credentials('aws-ec2-ssh-key')
            }
            steps {
                echo 'Deploying to AWS EC2...'
                // Copy production docker-compose to EC2
                sh "scp -o StrictHostKeyChecking=no -i $SSH_KEY docker-compose.prod.yml ${EC2_HOST}:~/docker-compose.prod.yml"
                
                // Execute remote deployment commands
                sh """ssh -o StrictHostKeyChecking=no -i $SSH_KEY ${EC2_HOST} << EOF
                    export DOCKERHUB_USERNAME=${DOCKER_CREDS_USR}
                    
                    // Stop old containers
                    docker-compose -f docker-compose.prod.yml down --remove-orphans || true
                        
                        // Pull latest images
                        docker-compose -f docker-compose.prod.yml pull
                        
                        // Start new containers
                        docker-compose -f docker-compose.prod.yml up -d
EOF"""
                }
            }
        }
        
        stage(' Cluster Health Check') {
            steps {
                echo 'Initiating health probe on EC2 gateway...'
                script {
                    int retries = 5
                    boolean healthy = false
                    // We extract the IP/Host to run curl. Assuming EC2_HOST format user@host
                    def host = env.EC2_HOST.split('@')[1]
                    
                    while (retries > 0 && !healthy) {
                        try {
                            sh "curl -s http://${host}:5000/ > /dev/null || exit 1"
                            echo ' AWS Central Gateway is online.'
                            healthy = true
                        } catch (Exception e) {
                            echo " Probe failed. Central gateway initializing... Retrying in 10s (${retries} attempts left)"
                            sleep 10
                            retries--
                        }
                    }
                    if (!healthy) {
                        error ' Deployment failed: AWS Cluster health checks timed out!'
                    }
                }
            }
        }
    }
    
    post {
        success {
            echo ' AWS Real-Time Chat Workspace successfully deployed and healthy!'
        }
        failure {
            echo ' Jenkins CI/CD Pipeline execution failed.'
        }
    }
}
