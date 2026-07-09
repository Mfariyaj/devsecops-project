// ============================================
// Shared Library: vars/devsecops.groovy
// Usage: @Library('devsecops-shared-lib') _
//        devsecops.buildAndDeploy('user-service', '3001')
// ============================================

def buildAndDeploy(String serviceName, String port) {
    pipeline {
        agent any
        
        environment {
            IMAGE_TAG = "v${BUILD_NUMBER}"
            REGISTRY = "localhost:5000"
        }
        
        stages {
            stage('Checkout') {
                steps {
                    checkout scm
                }
            }
            
            stage('Code Quality') {
                parallel {
                    stage('SonarQube Scan') {
                        steps {
                            dir("microservices/${serviceName}") {
                                withSonarQubeEnv('SonarQube') {
                                    sh "sonar-scanner -Dsonar.projectKey=${serviceName}"
                                }
                            }
                        }
                    }
                    stage('Lint') {
                        steps {
                            dir("microservices/${serviceName}") {
                                sh 'npm run lint || true'
                            }
                        }
                    }
                }
            }
            
            stage('Quality Gate') {
                steps {
                    timeout(time: 2, unit: 'MINUTES') {
                        waitForQualityGate abortPipeline: true
                    }
                }
            }
            
            stage('Build Image') {
                steps {
                    dir("microservices/${serviceName}") {
                        sh "docker build -t ${serviceName}:${IMAGE_TAG} ."
                    }
                }
            }
            
            stage('Security Scan') {
                parallel {
                    stage('Trivy - Image') {
                        steps {
                            sh """
                                trivy image --severity CRITICAL \
                                  --exit-code 1 \
                                  --format json \
                                  --output trivy-image-${serviceName}.json \
                                  ${serviceName}:${IMAGE_TAG}
                            """
                        }
                    }
                    stage('Trivy - Config') {
                        steps {
                            sh """
                                trivy config --severity CRITICAL \
                                  --exit-code 0 \
                                  k8s-manifests/base/${serviceName}.yaml
                            """
                        }
                    }
                }
            }
            
            stage('Deploy to Dev') {
                steps {
                    sh """
                        kubectl set image deployment/${serviceName} \
                          ${serviceName}=${serviceName}:${IMAGE_TAG} \
                          -n devsecops-apps \
                          --record
                    """
                    sh "kubectl rollout status deployment/${serviceName} -n devsecops-apps --timeout=120s"
                }
            }
            
            stage('Integration Tests') {
                steps {
                    sh """
                        sleep 10
                        RESPONSE=\$(kubectl exec -n devsecops-apps deploy/gateway-service -- \
                          wget -qO- http://${serviceName}:${port}/health)
                        echo "Health check: \$RESPONSE"
                        echo \$RESPONSE | grep -q "UP" || exit 1
                    """
                }
            }
        }
        
        post {
            success {
                echo "✅ ${serviceName}:${IMAGE_TAG} deployed successfully!"
            }
            failure {
                echo "❌ ROLLING BACK ${serviceName}..."
                sh "kubectl rollout undo deployment/${serviceName} -n devsecops-apps"
            }
            always {
                archiveArtifacts artifacts: "trivy-*.json", allowEmptyArchive: true
            }
        }
    }
}

return this
