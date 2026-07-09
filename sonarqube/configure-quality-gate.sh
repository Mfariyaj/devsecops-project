#!/bin/bash
# ============================================
# Configure SonarQube Quality Gates via API
# Run after SonarQube is accessible
# ============================================

SONAR_URL="http://$(minikube ip):32001"
SONAR_TOKEN="admin:admin"  # Default credentials

echo "🔧 Configuring SonarQube at: $SONAR_URL"
echo ""

# 1. Create Quality Gate
echo "1️⃣  Creating Quality Gate: DevSecOps-Gate"
curl -s -u $SONAR_TOKEN -X POST \
  "$SONAR_URL/api/qualitygates/create?name=DevSecOps-Gate" | jq .

# 2. Add conditions to Quality Gate
GATE_ID=$(curl -s -u $SONAR_TOKEN "$SONAR_URL/api/qualitygates/show?name=DevSecOps-Gate" | jq -r '.id')

echo "2️⃣  Adding conditions (Gate ID: $GATE_ID)..."

# Coverage > 80%
curl -s -u $SONAR_TOKEN -X POST \
  "$SONAR_URL/api/qualitygates/create_condition?gateId=$GATE_ID&metric=coverage&op=LT&error=80"

# Duplicated lines < 3%
curl -s -u $SONAR_TOKEN -X POST \
  "$SONAR_URL/api/qualitygates/create_condition?gateId=$GATE_ID&metric=duplicated_lines_density&op=GT&error=3"

# Security rating = A
curl -s -u $SONAR_TOKEN -X POST \
  "$SONAR_URL/api/qualitygates/create_condition?gateId=$GATE_ID&metric=security_rating&op=GT&error=1"

# Reliability rating = A
curl -s -u $SONAR_TOKEN -X POST \
  "$SONAR_URL/api/qualitygates/create_condition?gateId=$GATE_ID&metric=reliability_rating&op=GT&error=1"

# Bugs = 0 on new code
curl -s -u $SONAR_TOKEN -X POST \
  "$SONAR_URL/api/qualitygates/create_condition?gateId=$GATE_ID&metric=new_bugs&op=GT&error=0"

# Vulnerabilities = 0 on new code
curl -s -u $SONAR_TOKEN -X POST \
  "$SONAR_URL/api/qualitygates/create_condition?gateId=$GATE_ID&metric=new_vulnerabilities&op=GT&error=0"

echo ""
echo "3️⃣  Setting as default gate..."
curl -s -u $SONAR_TOKEN -X POST \
  "$SONAR_URL/api/qualitygates/set_as_default?name=DevSecOps-Gate"

echo ""
echo "4️⃣  Creating webhook for Jenkins..."
curl -s -u $SONAR_TOKEN -X POST \
  "$SONAR_URL/api/webhooks/create?name=Jenkins&url=http://jenkins.jenkins.svc.cluster.local:8080/sonarqube-webhook/"

echo ""
echo "✅ SonarQube configured with DevSecOps Quality Gate!"
echo ""
echo "Quality Gate Conditions:"
echo "  • Code Coverage ≥ 80%"
echo "  • Duplicated Lines ≤ 3%"
echo "  • Security Rating = A"
echo "  • Reliability Rating = A"
echo "  • Zero new bugs"
echo "  • Zero new vulnerabilities"
