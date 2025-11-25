# GitHub Actions CI/CD Setup Guide

This guide helps you configure GitHub Actions for automated deployment of your three-tier application.

## 📋 Prerequisites

Before setting up GitHub Actions, ensure you have:

1. ✅ AWS infrastructure deployed (via Terraform)
2. ✅ EKS cluster running
3. ✅ ECR repositories created
4. ✅ kubectl configured locally
5. ✅ Code pushed to GitHub repository

## 🔐 Step 1: Create AWS IAM User for GitHub Actions

Create a dedicated IAM user with programmatic access for GitHub Actions:

```bash
# Create IAM user
aws iam create-user --user-name github-actions-deployer

# Create access key
aws iam create-access-key --user-name github-actions-deployer
```

**Save the output** - you'll need the `AccessKeyId` and `SecretAccessKey`.

### Attach Required Policies

```bash
# Attach ECR permissions
aws iam attach-user-policy \
  --user-name github-actions-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

# Attach EKS permissions
aws iam attach-user-policy \
  --user-name github-actions-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy

# Create custom policy for EKS access
cat > github-actions-eks-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "eks:DescribeCluster",
        "eks:ListClusters",
        "eks:DescribeNodegroup",
        "eks:ListNodegroups"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create and attach the policy
aws iam create-policy \
  --policy-name GitHubActionsEKSAccess \
  --policy-document file://github-actions-eks-policy.json

# Get your AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Attach the policy
aws iam attach-user-policy \
  --user-name github-actions-deployer \
  --policy-arn arn:aws:iam::${AWS_ACCOUNT_ID}:policy/GitHubActionsEKSAccess
```

## 🔑 Step 2: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add the following secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_ACCESS_KEY_ID` | `<your-access-key-id>` | From IAM user creation |
| `AWS_SECRET_ACCESS_KEY` | `<your-secret-access-key>` | From IAM user creation |
| `AWS_REGION` | `us-east-1` | Your AWS region |
| `EKS_CLUSTER_NAME` | `ecommerce-cluster` | Your EKS cluster name |

### How to Add Secrets

```
1. Click "New repository secret"
2. Name: AWS_ACCESS_KEY_ID
3. Secret: <paste your access key>
4. Click "Add secret"
5. Repeat for each secret
```

## 🔧 Step 3: Update EKS ConfigMap for GitHub Actions Access

GitHub Actions needs permission to deploy to your EKS cluster:

```bash
# Edit aws-auth ConfigMap
kubectl edit configmap aws-auth -n kube-system
```

Add the GitHub Actions IAM user to the `mapUsers` section:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapUsers: |
    - userarn: arn:aws:iam::<AWS_ACCOUNT_ID>:user/github-actions-deployer
      username: github-actions-deployer
      groups:
        - system:masters
```

Replace `<AWS_ACCOUNT_ID>` with your actual AWS account ID.

Save and exit (`:wq` in vim).

## 📝 Step 4: Update Workflow File (if needed)

The workflow file is already configured at `.github/workflows/ci-cd.yml`.

Verify the following settings match your setup:

```yaml
env:
  AWS_REGION: us-east-1  # Change if using different region
  EKS_CLUSTER_NAME: ecommerce-cluster  # Change if using different name
```

## 🚀 Step 5: Test the Workflow

### Option A: Push to Main Branch

```bash
# Make a small change
echo "# Updated" >> README.md

# Commit and push
git add README.md
git commit -m "Test GitHub Actions workflow"
git push origin main
```

### Option B: Manual Trigger

1. Go to GitHub → **Actions** tab
2. Select **CI/CD Pipeline** workflow
3. Click **Run workflow**
4. Select branch: `main`
5. Click **Run workflow**

## 📊 Step 6: Monitor the Workflow

1. Go to **Actions** tab in your GitHub repository
2. Click on the running workflow
3. Watch the progress of each job:
   - **Test**: Runs linting and unit tests
   - **Build**: Builds and pushes Docker images to ECR
   - **Deploy**: Deploys to EKS cluster

### Expected Timeline

- **Test Job**: ~2-3 minutes
- **Build Job**: ~5-10 minutes
- **Deploy Job**: ~3-5 minutes
- **Total**: ~10-18 minutes

## ✅ Step 7: Verify Deployment

After the workflow completes successfully:

```bash
# Check pods are running
kubectl get pods -n ecommerce-app

# Check deployment status
kubectl rollout status deployment/frontend -n ecommerce-app
kubectl rollout status deployment/backend -n ecommerce-app
kubectl rollout status statefulset/postgres -n ecommerce-app

# Get service URLs
kubectl get svc -n ecommerce-app
```

## 🔍 Troubleshooting

### Issue: "Error: The config file does not exist"

**Solution**: Update kubeconfig access in aws-auth ConfigMap (Step 3)

### Issue: "Error: Unauthorized"

**Solution**: Check AWS credentials in GitHub Secrets

### Issue: "Error: Cannot pull image from ECR"

**Solution**: Verify ECR permissions for IAM user

```bash
# Test ECR access
aws ecr describe-repositories --region us-east-1
```

### Issue: "Error: Cluster not found"

**Solution**: Verify EKS_CLUSTER_NAME matches your actual cluster name

```bash
# List clusters
aws eks list-clusters --region us-east-1
```

### Issue: Build fails on "npm ci"

**Solution**: Ensure package-lock.json files exist

```bash
# Generate lock files if missing
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Commit the lock files
git add frontend/package-lock.json backend/package-lock.json
git commit -m "Add package-lock.json files"
git push origin main
```

### Issue: Trivy scan fails

**Solution**: This is set to `continue-on-error: true`, so it won't block deployment. To fix vulnerabilities:

```bash
# Update base images in Dockerfiles
# Update npm dependencies
cd frontend && npm audit fix && cd ..
cd backend && npm audit fix && cd ..
```

## 🔄 Workflow Behavior

### Automatic Triggers

The workflow runs automatically on:
- **Push to main branch**: Full CI/CD pipeline
- **Pull request to main**: Test job only (no deployment)

### Manual Triggers

You can manually trigger the workflow:
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"

## 📈 Monitoring Deployments

### View Workflow Logs

1. Go to **Actions** tab
2. Click on a workflow run
3. Click on a job (Test, Build, or Deploy)
4. Expand steps to see detailed logs

### View Application Logs

```bash
# Frontend logs
kubectl logs -f deployment/frontend -n ecommerce-app

# Backend logs
kubectl logs -f deployment/backend -n ecommerce-app

# Database logs
kubectl logs -f statefulset/postgres -n ecommerce-app
```

### View Kubernetes Events

```bash
# All events in namespace
kubectl get events -n ecommerce-app --sort-by='.lastTimestamp'

# Specific deployment events
kubectl describe deployment frontend -n ecommerce-app
```

## 🎯 Best Practices

### 1. Use Branch Protection

Protect your main branch:
1. Go to Settings → Branches
2. Add rule for `main` branch
3. Enable:
   - Require pull request reviews
   - Require status checks to pass
   - Require branches to be up to date

### 2. Use Environments

Create GitHub environments for staging/production:
1. Go to Settings → Environments
2. Create `production` environment
3. Add protection rules
4. Require manual approval for production deployments

### 3. Add Notifications

Add Slack/email notifications on deployment:

```yaml
- name: Send Slack notification
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 4. Implement Rollback

Add a rollback job:

```yaml
- name: Rollback on failure
  if: failure()
  run: |
    kubectl rollout undo deployment/frontend -n ecommerce-app
    kubectl rollout undo deployment/backend -n ecommerce-app
```

## 🔐 Security Best Practices

1. **Rotate AWS credentials** regularly
2. **Use least privilege** IAM policies
3. **Enable branch protection** rules
4. **Review security scan** results
5. **Keep secrets** in GitHub Secrets, never in code
6. **Enable 2FA** on GitHub account
7. **Audit workflow runs** regularly

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [EKS User Guide](https://docs.aws.amazon.com/eks/latest/userguide/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 🎉 Success Checklist

- [ ] IAM user created with proper permissions
- [ ] GitHub Secrets configured
- [ ] EKS aws-auth ConfigMap updated
- [ ] Workflow file reviewed and updated
- [ ] Test workflow run completed successfully
- [ ] Application accessible via LoadBalancer
- [ ] Monitoring dashboards showing data
- [ ] CI/CD pipeline running on every push

## 🆘 Need Help?

If you're stuck:

1. Check the troubleshooting section above
2. Review workflow logs in GitHub Actions
3. Check AWS CloudWatch logs
4. Verify all secrets are set correctly
5. Ensure IAM permissions are correct

---

**Congratulations!** 🎊 Your CI/CD pipeline is now set up and ready to automatically deploy your application on every push to main!
