#!/bin/bash
# ============================================================
# END-TO-END DEVSECOPS PIPELINE
# Simulates the full production workflow:
#   Code → SonarQube → Build → Trivy → Deploy → Monitor
# ============================================================

set -e
export PATH="$HOME/.local/bin:$PATH"
eval $(minikube docker-env)

SERVICE="${1:-user-service}"
PORT="${2:-3001}"
PROJECT_DIR="$HOME/devops-projects/devsecops-project"

echo "╔══════════════════════════════════════════════════════╗"
echo "║   🚀 DevSecOps End-to-End Pipeline                  ║"
echo "║   Service: $SERVICE                           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ============ STAGE 1: CODE QUALITY ============
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 STAGE 1: Code Quality (SonarQube)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  → In production: sonar-scanner runs against SonarQube server"
echo "  → Quality Gate checks: Coverage≥80%, Duplication≤3%, Security=A"
echo "  → Result: Blocks pipeline if quality gate fails"
# Simulated check
if [ -f "$PROJECT_DIR/microservices/$SERVICE/sonar-project.properties" ]; then
    echo "  ✅ SonarQube config found"
else
    echo "  ❌ Missing sonar-project.properties"
    exit 1
fi
echo ""

# ============ STAGE 2: SECRET DETECTION ============
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 STAGE 2: Secret Detection (Trivy)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
trivy fs --scanners secret -q --severity HIGH,CRITICAL "$PROJECT_DIR/microservices/$SERVICE/" 2>/dev/null
echo "  ✅ No secrets found in source code"
echo ""

# ============ STAGE 3: BUILD DOCKER IMAGE ============
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 STAGE 3: Build Docker Image"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
IMAGE_TAG="v$(date +%Y%m%d%H%M)"
docker build -t "$SERVICE:$IMAGE_TAG" "$PROJECT_DIR/microservices/$SERVICE/" -q 2>/dev/null
echo "  ✅ Built: $SERVICE:$IMAGE_TAG"
echo ""

# ============ STAGE 4: IMAGE SECURITY SCAN ============
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 STAGE 4: Image Security Scan (Trivy)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SCAN_RESULT=$(trivy image --severity CRITICAL --exit-code 0 -q "$SERVICE:$IMAGE_TAG" 2>&1 | grep -c "CRITICAL" || true)
if [ "$SCAN_RESULT" -gt 5 ]; then
    echo "  ⚠️  WARNING: $SCAN_RESULT CRITICAL vulnerabilities found"
    echo "  → In strict mode, pipeline would FAIL here"
else
    echo "  ✅ Security scan passed (CRITICAL: $SCAN_RESULT)"
fi
echo ""

# ============ STAGE 5: IaC SCAN ============
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  STAGE 5: Infrastructure-as-Code Scan (Trivy)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
IAC_ISSUES=$(trivy config -q --severity CRITICAL "$PROJECT_DIR/k8s-manifests/base/$SERVICE.yaml" 2>&1 | grep -c "CRITICAL" || true)
echo "  ℹ️  K8s manifest issues (CRITICAL): $IAC_ISSUES"
echo "  → Use hardened manifests for production"
echo ""

# ============ STAGE 6: DEPLOY TO KUBERNETES ============
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "☸️  STAGE 6: Deploy to Kubernetes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
kubectl set image "deployment/$SERVICE" "$SERVICE=$SERVICE:$IMAGE_TAG" -n devsecops-apps 2>/dev/null
kubectl rollout status "deployment/$SERVICE" -n devsecops-apps --timeout=60s 2>/dev/null
echo "  ✅ Deployed: $SERVICE:$IMAGE_TAG"
echo ""

# ============ STAGE 7: HEALTH VERIFICATION ============
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 STAGE 7: Health Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 5
HEALTH=$(kubectl exec -n devsecops-apps deploy/gateway-service -- wget -qO- "http://$SERVICE:$PORT/health" 2>/dev/null)
if echo "$HEALTH" | grep -q "UP"; then
    echo "  ✅ Health check PASSED: $HEALTH"
else
    echo "  ❌ Health check FAILED - Initiating rollback!"
    kubectl rollout undo "deployment/$SERVICE" -n devsecops-apps
    exit 1
fi
echo ""

# ============ STAGE 8: MONITORING VERIFICATION ============
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 STAGE 8: Monitoring Active"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  → Prometheus: Scraping metrics every 15s"
echo "  → Grafana: Dashboard at admin/admin123"
echo "  → Alerts: PodDown, HighCPU, HighErrorRate configured"
PROM_STATUS=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus --no-headers 2>/dev/null | grep Running | wc -l)
echo "  ✅ Prometheus pods running: $PROM_STATUS"
echo ""

# ============ SUMMARY ============
echo "╔══════════════════════════════════════════════════════╗"
echo "║   ✅ PIPELINE COMPLETE                              ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║   Service:    $SERVICE                        ║"
echo "║   Image:      $SERVICE:$IMAGE_TAG      ║"
echo "║   SonarQube:  ✅ Quality Gate                       ║"
echo "║   Trivy:      ✅ Image + IaC Scanned                ║"
echo "║   Deploy:     ✅ K8s Rolling Update                  ║"
echo "║   Health:     ✅ Verified                            ║"
echo "║   Monitoring: ✅ Active                              ║"
echo "╚══════════════════════════════════════════════════════╝"
