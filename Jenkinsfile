pipeline {
    agent any

    triggers {
        pollSCM('H/5 * * * *')
    }

    environment {

        // DockerHub Jenkins Credential ID
        DOCKERHUB_CREDENTIALS_ID = 'dockerhub'

        // AWS SSH Credential ID
        SSH_CREDENTIALS_ID = 'aws-key'

        // AWS EC2 Host
        EC2_HOST = 'ubuntu@32.192.25.114'

        // Docker Compose Project Name
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
                        credentialsId: "${DOCKERHUB_CREDENTIALS_ID}",
                        usernameVariable: 'DOCKERHUB_USERNAME',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
                ]) {

                    sh '''
                        echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
                    '''
                }
            }
        }

        stage('Build Docker Images') {
            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: "${DOCKERHUB_CREDENTIALS_ID}",
                        usernameVariable: 'DOCKERHUB_USERNAME',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
                ]) {

                    sh '''
                        echo "Building Auth Service..."
                        docker build -t $DOCKERHUB_USERNAME/micro-chat-auth-service:latest ./services/auth-service

                        echo "Building Chat Service..."
                        docker build -t $DOCKERHUB_USERNAME/micro-chat-chat-service:latest ./services/chat-service

                        echo "Building Notification Service..."
                        docker build -t $DOCKERHUB_USERNAME/micro-chat-notification-service:latest ./services/notification-service

                        echo "Building Gateway..."
                        docker build -t $DOCKERHUB_USERNAME/micro-chat-gateway:latest ./gateway

                        echo "Building Client..."
                        docker build -t $DOCKERHUB_USERNAME/micro-chat-client:latest ./client
                    '''
                }
            }
        }

        stage('Push Docker Images') {
            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: "${DOCKERHUB_CREDENTIALS_ID}",
                        usernameVariable: 'DOCKERHUB_USERNAME',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
                ]) {

                    sh '''
                        echo "Pushing Auth Service..."
                        docker push $DOCKERHUB_USERNAME/micro-chat-auth-service:latest

                        echo "Pushing Chat Service..."
                        docker push $DOCKERHUB_USERNAME/micro-chat-chat-service:latest

                        echo "Pushing Notification Service..."
                        docker push $DOCKERHUB_USERNAME/micro-chat-notification-service:latest

                        echo "Pushing Gateway..."
                        docker push $DOCKERHUB_USERNAME/micro-chat-gateway:latest

                        echo "Pushing Client..."
                        docker push $DOCKERHUB_USERNAME/micro-chat-client:latest
                    '''
                }
            }
        }

        stage('Deploy to AWS EC2') {
            steps {

                echo 'Deploying application to AWS EC2...'

                withCredentials([

                    sshUserPrivateKey(
                        credentialsId: "${SSH_CREDENTIALS_ID}",
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    ),

                    usernamePassword(
                        credentialsId: "${DOCKERHUB_CREDENTIALS_ID}",
                        usernameVariable: 'DOCKERHUB_USERNAME',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )

                ]) {

                    sh '''
                        echo "Copying docker-compose file to EC2..."

                        scp -o StrictHostKeyChecking=no \
                        -i $SSH_KEY \
                        docker-compose.prod.yml \
                        $EC2_HOST:~/docker-compose.prod.yml
                    '''

                    sh '''
                        echo "Connecting to EC2..."

                        ssh -o StrictHostKeyChecking=no \
                        -i $SSH_KEY \
                        $EC2_HOST << EOF

                        export DOCKERHUB_USERNAME='$DOCKERHUB_USERNAME'

                        echo "Stopping old containers..."
                        docker compose -f docker-compose.prod.yml down --remove-orphans || true

                        echo "Pulling latest Docker images..."
                        docker compose -f docker-compose.prod.yml pull

                        echo "Starting updated containers..."
                        docker compose -f docker-compose.prod.yml up -d

                        echo "Cleaning unused images..."
                        docker image prune -af || true

EOF
                    '''
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

                            sh """
                                curl -f http://${host}:5000/ > /dev/null
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

        always {
            echo 'Pipeline execution finished.'
        }
    }
}