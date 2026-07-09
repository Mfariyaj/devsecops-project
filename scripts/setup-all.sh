#!/bin/bash
# ===========================================
# DevSecOps Lab - Complete Setup Script
# Run: bash scripts/setup-all.sh
# ===========================================

set -e
export PATH="$HOME/.local/bin:$PATH"
PROJECT_DIR="$HOME/devops-projects/devsecops-project"

echo "🚀 Starting DevSecOps Lab Setup..."
echo ""

# 1. Start Minikube
echo "1️⃣  Starting Minikube cluster..."
minikube start --cpus=4 --memory=6144 --disk-size=50g --driver=docker \
  --addons=ingress,metrics-server,dashboard --kubernetes-version=v1.28.0

# 2. Create namespaces
echo "2️⃣  Creating namespaces..."
for ns in devsecops-apps jenkins sonarqube argocd istio-system monitoring; do
  kubectl create namespace $ns --dry-run=client -o yaml | kubectl apply -f -
done

# 3. Build Docker images
echo "3️⃣  Building 10 microservice images..."
eval $(minikube docker-env)
for svc in user-service product-service order-service payment-service cart-service notification-service inventory-service shipping-service review-service gateway-service; do
  docker build -t $svc:v1 $PROJECT_DIR/microservices/$svc/ -q
  echo "   ✓ $svc"
done

# 4. Deploy microservices
echo "4️⃣  Deploying microservices..."
kubectl apply -f $PROJECT_DIR/k8s-manifests/base/

# 5. Install all tools in parallel
echo "5️⃣  Installing DevSecOps tools (parallel)..."

helm repo add jenkins https://charts.jenkins.io 2>/dev/null || true
helm repo add sonarqube https://SonarSource.github.io/helm-chart-sonarqube 2>/dev/null || true
helm repo add argo https://argoproj.github.io/argo-helm 2>/dev/null || true
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
helm repo update

# Jenkins
helm upgrade --install jenkins jenkins/jenkins -n jenkins \
  -f $PROJECT_DIR/jenkins/values.yaml --timeout 8m &

# SonarQube
helm upgrade --install sonarqube sonarqube/sonarqube -n sonarqube \
  --set monitoringPasscode=devsecops --set community.enabled=true \
  --set service.type=NodePort --set service.nodePort=32001 --timeout 8m &

# ArgoCD
helm upgrade --install argocd argo/argo-cd -n argocd \
  --set server.service.type=NodePort --set configs.params."server\.insecure"=true --timeout 8m &

# Prometheus + Grafana
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack -n monitoring \
  --set grafana.adminPassword=admin123 --set grafana.service.type=NodePort \
  --set grafana.service.nodePort=32003 --set alertmanager.enabled=false --timeout 8m &

# Istio
istioctl install --set profile=minimal -y &

wait
echo ""
echo "============================================"
echo "  ✅ DEVSECOPS LAB READY!"
echo "============================================"
echo ""
echo "Access tools with:"
echo "  minikube service jenkins -n jenkins"
echo "  minikube service sonarqube-sonarqube -n sonarqube"
echo "  minikube service argocd-server -n argocd"
echo "  minikube service monitoring-grafana -n monitoring"
echo ""
echo "Credentials:"
echo "  Jenkins:   admin / admin123"
echo "  SonarQube: admin / admin"
echo "  ArgoCD:    admin / $(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d)"
echo "  Grafana:   admin / admin123"
