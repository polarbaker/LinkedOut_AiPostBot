"""
Approval Workflow Module for Enhanced LinkedIn Post Generator
This module manages the approval queue and analytics for generated content.
"""
import json
import os
from datetime import datetime

class ApprovalWorkflow:
    def __init__(self):
        """Initialize the approval workflow"""
        self.approval_queue = []
        self.approved_posts = []
        self.drafts = []
        self.analytics = {
            'postsGenerated': 0,
            'postsApproved': 0,
            'averageEngagement': 0.0,
            'styleConsistency': 90,
            'topPerformingFormat': 'Professional Insight',
            'bestPostingTime': '9:00 AM',
            'sourcePerformance': {}
        }
        
        # Load saved data if it exists
        self._load_data()
        
    def _load_data(self):
        """Load saved data from JSON files"""
        try:
            if os.path.exists('workflow_data.json'):
                with open('workflow_data.json', 'r') as f:
                    data = json.load(f)
                    self.approval_queue = data.get('approval_queue', [])
                    self.approved_posts = data.get('approved_posts', [])
                    self.drafts = data.get('drafts', [])
            
            if os.path.exists('analytics_data.json'):
                with open('analytics_data.json', 'r') as f:
                    self.analytics = json.load(f)
        except Exception as e:
            print(f"Error loading workflow data: {e}")
    
    def _save_data(self):
        """Save data to JSON files"""
        try:
            with open('workflow_data.json', 'w') as f:
                json.dump({
                    'approval_queue': self.approval_queue,
                    'approved_posts': self.approved_posts,
                    'drafts': self.drafts
                }, f)
                
            with open('analytics_data.json', 'w') as f:
                json.dump(self.analytics, f)
        except Exception as e:
            print(f"Error saving workflow data: {e}")
    
    def add_to_queue(self, post):
        """
        Add a generated post to the approval queue
        
        Args:
            post (dict): Generated post object
            
        Returns:
            bool: True if successful
        """
        if not post:
            return False
            
        # Set status to pending
        post['status'] = 'pending'
        post['added_to_queue_at'] = datetime.now().isoformat()
        
        # Add to queue
        self.approval_queue.append(post)
        
        # Update analytics
        self.analytics['postsGenerated'] += 1
        
        # Track source performance
        source = post.get('source', 'Unknown')
        if source in self.analytics['sourcePerformance']:
            # Update existing source performance
            current_score = self.analytics['sourcePerformance'][source]
            engagement = post.get('engagementScore', 0)
            self.analytics['sourcePerformance'][source] = round((current_score + engagement) / 2, 1)
        else:
            # Add new source
            self.analytics['sourcePerformance'][source] = post.get('engagementScore', 5.0)
        
        # Save data
        self._save_data()
        
        return True
    
    def get_queue(self):
        """
        Get the current approval queue
        
        Returns:
            list: List of posts in the approval queue
        """
        return self.approval_queue
        
    def approve_post(self, post_id, edits=None):
        """
        Approve a post from the queue
        
        Args:
            post_id: ID of the post to approve
            edits (dict, optional): Edited content
            
        Returns:
            bool: True if successful
        """
        # Find the post in the queue
        for i, post in enumerate(self.approval_queue):
            if post.get('id') == post_id:
                # Apply edits if provided
                if edits:
                    post['content'] = edits.get('content', post['content'])
                    post['hashtags'] = edits.get('hashtags', post['hashtags'])
                
                # Update post status
                post['status'] = 'approved'
                post['approved_at'] = datetime.now().isoformat()
                
                # Move from queue to approved posts
                self.approved_posts.append(post)
                self.approval_queue.pop(i)
                
                # Update analytics
                self.analytics['postsApproved'] += 1
                
                total_engagement = sum(p.get('engagementScore', 0) for p in self.approved_posts)
                if self.analytics['postsApproved'] > 0:
                    self.analytics['averageEngagement'] = round(total_engagement / self.analytics['postsApproved'], 1)
                
                # Track top performing format
                formats = {}
                for p in self.approved_posts:
                    post_type = p.get('post_type', 'Professional Insight')
                    if post_type not in formats:
                        formats[post_type] = []
                    formats[post_type].append(p.get('engagementScore', 0))
                
                # Find format with highest average engagement
                highest_avg = 0
                top_format = 'Professional Insight'
                for format_type, scores in formats.items():
                    if scores:
                        avg = sum(scores) / len(scores)
                        if avg > highest_avg:
                            highest_avg = avg
                            top_format = format_type
                
                self.analytics['topPerformingFormat'] = top_format
                
                # Save data
                self._save_data()
                
                return True
        
        return False
    
    def save_draft(self, post):
        """
        Save a post as draft
        
        Args:
            post (dict): Post to save as draft
            
        Returns:
            bool: True if successful
        """
        if not post:
            return False
            
        # Set status to draft
        post['status'] = 'draft'
        post['saved_at'] = datetime.now().isoformat()
        
        # Add to drafts
        self.drafts.append(post)
        
        # Save data
        self._save_data()
        
        return True
    
    def get_analytics(self):
        """
        Get analytics data
        
        Returns:
            dict: Analytics data
        """
        return self.analytics
