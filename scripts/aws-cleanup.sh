#!/bin/bash

# AWS Resource Cleanup Script
# This script helps identify and clean up AWS resources
# WARNING: Review carefully before running - this will DELETE resources!

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}========================================${NC}"
echo -e "${RED}  AWS Resource Cleanup Script${NC}"
echo -e "${RED}  WARNING: This will DELETE resources!${NC}"
echo -e "${RED}========================================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    echo "Install with: pip install awscli"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

# Get current AWS account info
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)

echo -e "${BLUE}Account ID:${NC} $ACCOUNT_ID"
echo -e "${BLUE}Region:${NC} $REGION"
echo ""

# Function to list EC2 instances
list_ec2_instances() {
    echo -e "\n${YELLOW}EC2 Instances:${NC}"
    aws ec2 describe-instances \
        --query 'Reservations[*].Instances[*].[InstanceId,State.Name,InstanceType,Tags[?Key==`Name`]|[0].Value,LaunchTime]' \
        --output table
}

# Function to list EBS volumes
list_ebs_volumes() {
    echo -e "\n${YELLOW}EBS Volumes:${NC}"
    aws ec2 describe-volumes \
        --query 'Volumes[*].[VolumeId,Size,State,Attachments[0].InstanceId,CreateTime]' \
        --output table
}

# Function to list Security Groups
list_security_groups() {
    echo -e "\n${YELLOW}Security Groups (excluding default):${NC}"
    aws ec2 describe-security-groups \
        --query 'SecurityGroups[?GroupName!=`default`].[GroupId,GroupName,Description]' \
        --output table
}

# Function to list Elastic IPs
list_elastic_ips() {
    echo -e "\n${YELLOW}Elastic IPs:${NC}"
    aws ec2 describe-addresses \
        --query 'Addresses[*].[AllocationId,PublicIp,InstanceId,Domain]' \
        --output table
}

# Function to list Key Pairs
list_key_pairs() {
    echo -e "\n${YELLOW}Key Pairs:${NC}"
    aws ec2 describe-key-pairs \
        --query 'KeyPairs[*].[KeyPairId,KeyName,CreateTime]' \
        --output table
}

# Function to terminate EC2 instances
terminate_instances() {
    local instances=$1
    if [ -n "$instances" ]; then
        print_warning "Terminating instances: $instances"
        aws ec2 terminate-instances --instance-ids $instances
        print_status "Termination initiated"
    fi
}

# Function to delete volumes
delete_volumes() {
    local volumes=$1
    if [ -n "$volumes" ]; then
        print_warning "Deleting volumes: $volumes"
        for volume in $volumes; do
            aws ec2 delete-volume --volume-id $volume 2>/dev/null || true
        done
        print_status "Volume deletion initiated"
    fi
}

# Function to release Elastic IPs
release_elastic_ips() {
    local allocations=$1
    if [ -n "$allocations" ]; then
        print_warning "Releasing Elastic IPs: $allocations"
        for allocation in $allocations; do
            aws ec2 release-address --allocation-id $allocation 2>/dev/null || true
        done
        print_status "Elastic IPs released"
    fi
}

# Function to delete security groups
delete_security_groups() {
    local groups=$1
    if [ -n "$groups" ]; then
        print_warning "Deleting security groups: $groups"
        for group in $groups; do
            aws ec2 delete-security-group --group-id $group 2>/dev/null || true
        done
        print_status "Security groups deleted"
    fi
}

# Main menu
show_menu() {
    echo -e "\n${BLUE}What would you like to do?${NC}"
    echo "1) List all resources"
    echo "2) Clean up specific resource type"
    echo "3) Full cleanup (DANGEROUS!)"
    echo "4) Exit"
}

# List all resources
list_all_resources() {
    print_info "Listing all AWS resources in region $REGION..."
    list_ec2_instances
    list_ebs_volumes
    list_security_groups
    list_elastic_ips
    list_key_pairs
}

# Cleanup specific resource type
cleanup_specific() {
    echo -e "\n${BLUE}Select resource type to clean:${NC}"
    echo "1) EC2 Instances"
    echo "2) EBS Volumes"
    echo "3) Security Groups"
    echo "4) Elastic IPs"
    echo "5) Back to main menu"
    
    read -p "Enter choice: " choice
    
    case $choice in
        1)
            list_ec2_instances
            read -p "Enter instance IDs to terminate (space-separated) or 'all' for all: " instances
            if [ "$instances" = "all" ]; then
                instances=$(aws ec2 describe-instances --query 'Reservations[*].Instances[?State.Name!=`terminated`].InstanceId' --output text)
            fi
            if [ -n "$instances" ]; then
                read -p "Are you sure you want to terminate these instances? (yes/no): " confirm
                if [ "$confirm" = "yes" ]; then
                    terminate_instances "$instances"
                fi
            fi
            ;;
        2)
            list_ebs_volumes
            read -p "Enter volume IDs to delete (space-separated) or 'all' for all available: " volumes
            if [ "$volumes" = "all" ]; then
                volumes=$(aws ec2 describe-volumes --query 'Volumes[?State==`available`].VolumeId' --output text)
            fi
            if [ -n "$volumes" ]; then
                read -p "Are you sure you want to delete these volumes? (yes/no): " confirm
                if [ "$confirm" = "yes" ]; then
                    delete_volumes "$volumes"
                fi
            fi
            ;;
        3)
            list_security_groups
            read -p "Enter security group IDs to delete (space-separated): " groups
            if [ -n "$groups" ]; then
                read -p "Are you sure you want to delete these security groups? (yes/no): " confirm
                if [ "$confirm" = "yes" ]; then
                    delete_security_groups "$groups"
                fi
            fi
            ;;
        4)
            list_elastic_ips
            read -p "Enter allocation IDs to release (space-separated) or 'all' for all: " allocations
            if [ "$allocations" = "all" ]; then
                allocations=$(aws ec2 describe-addresses --query 'Addresses[*].AllocationId' --output text)
            fi
            if [ -n "$allocations" ]; then
                read -p "Are you sure you want to release these Elastic IPs? (yes/no): " confirm
                if [ "$confirm" = "yes" ]; then
                    release_elastic_ips "$allocations"
                fi
            fi
            ;;
        5)
            return
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
}

# Full cleanup
full_cleanup() {
    print_warning "FULL CLEANUP will delete ALL resources in region $REGION!"
    echo "This includes: EC2 instances, volumes, security groups, elastic IPs"
    read -p "Are you ABSOLUTELY sure? Type 'DELETE ALL' to confirm: " confirm
    
    if [ "$confirm" = "DELETE ALL" ]; then
        print_info "Starting full cleanup..."
        
        # Terminate all EC2 instances
        print_info "Terminating all EC2 instances..."
        instances=$(aws ec2 describe-instances --query 'Reservations[*].Instances[?State.Name!=`terminated`].InstanceId' --output text)
        if [ -n "$instances" ]; then
            terminate_instances "$instances"
            print_info "Waiting for instances to terminate..."
            aws ec2 wait instance-terminated --instance-ids $instances
        fi
        
        # Delete all available volumes
        print_info "Deleting all available volumes..."
        volumes=$(aws ec2 describe-volumes --query 'Volumes[?State==`available`].VolumeId' --output text)
        delete_volumes "$volumes"
        
        # Release all Elastic IPs
        print_info "Releasing all Elastic IPs..."
        allocations=$(aws ec2 describe-addresses --query 'Addresses[*].AllocationId' --output text)
        release_elastic_ips "$allocations"
        
        # Delete non-default security groups
        print_info "Deleting custom security groups..."
        groups=$(aws ec2 describe-security-groups --query 'SecurityGroups[?GroupName!=`default`].GroupId' --output text)
        delete_security_groups "$groups"
        
        print_status "Full cleanup completed!"
    else
        print_info "Cleanup cancelled"
    fi
}

# Main loop
while true; do
    show_menu
    read -p "Enter choice: " choice
    
    case $choice in
        1)
            list_all_resources
            ;;
        2)
            cleanup_specific
            ;;
        3)
            full_cleanup
            ;;
        4)
            print_info "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
done