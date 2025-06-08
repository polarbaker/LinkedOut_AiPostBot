/**
 * API Connector for Enhanced LinkedIn Post Generator
 * This file handles communication between the frontend and backend API
 */

class APIConnector {
    constructor() {
        /**
         * Base URL for API requests
         */
        this.baseUrl = 'http://localhost:5003';
        
        /**
         * API Version
         */
        this.apiVersion = 'v1';
    }
    
    /**
     * Process API Response
     * @param {Object} response - API response object
     * @returns {Object} - Parsed and processed response data
     */
    async processResponse(response) {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle API error reported in response body
        if (data.status === 'error') {
            throw new Error(data.message || 'Unknown API error');
        }
        
        // Return data property if it exists, otherwise the whole response
        return data.data !== undefined ? data.data : data;
    }

    /**
     * Analyze voice from previous LinkedIn posts
     * @param {string} posts - Previous LinkedIn posts
     * @returns {Promise} - Voice analysis results
     */
    async analyzeVoice(posts) {
        try {
            const response = await fetch(`${this.baseUrl}/api/${this.apiVersion}/analyze-voice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ posts }),
            });

            return await this.processResponse(response);
        } catch (error) {
            console.error('Error analyzing voice:', error);
            throw error;
        }
    }

    /**
     * Configure a source for monitoring
     * @param {string} url - URL of the source to monitor
     * @param {string} type - Type of source (website, rss, etc.)
     * @param {string} frequency - Monitoring frequency
     * @returns {Promise} - Configuration results
     */
    async configureSources(url, type = 'website', frequency = 'daily') {
        try {
            const response = await fetch(`${this.baseUrl}/api/${this.apiVersion}/configure-sources`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url, type, frequency }),
            });

            return await this.processResponse(response);
        } catch (error) {
            console.error('Error configuring sources:', error);
            throw error;
        }
    }

    /**
     * Fetch content from monitored sources with enhanced filtering and scoring
     * @param {Object} options - Content fetch options
     * @param {string|Array} options.interests - User interests for relevance filtering
     * @param {boolean} options.forceRefresh - Force refresh content from sources
     * @param {string} options.category - Filter content by category
     * @param {number} options.maxArticles - Maximum number of articles to return
     * @returns {Promise} - Content results with articles ordered by relevance
     */
    async fetchContent(options = {}) {
        try {
            const {
                interests = '',
                forceRefresh = false,
                category = '',
                maxArticles = 10
            } = typeof options === 'string' || Array.isArray(options) 
                ? { interests: options } // Handle backward compatibility
                : options;
                
            // Build query parameters
            const params = new URLSearchParams();
            
            // Handle interests parameter
            if (Array.isArray(interests) && interests.length > 0) {
                params.append('interests', interests.join(','));
            } else if (typeof interests === 'string' && interests) {
                params.append('interests', interests);
            }
            
            // Add enhanced parameters
            if (forceRefresh) params.append('force_refresh', 'true');
            if (category) params.append('category', category);
            if (maxArticles !== 10) params.append('max_articles', maxArticles.toString());
            
            // Build URL with parameters
            const queryString = params.toString();
            const url = `${this.baseUrl}/api/${this.apiVersion}/fetch-content${queryString ? `?${queryString}` : ''}`;
            
            console.log(`Fetching content from: ${url}`);
            const response = await fetch(url);

            return await this.processResponse(response);
        } catch (error) {
            console.error('Error fetching content:', error);
            throw error;
        }
    }

    /**
     * Generate LinkedIn post
     * @param {Object} voiceProfile - Voice analysis profile
     * @param {Object} sourceContent - Source content for post generation
     * @param {string} postType - Type of post to generate
     * @returns {Promise} - Generated content
     */
    async generateContent(voiceProfile, sourceContent, postType) {
        try {
            const response = await fetch(`${this.baseUrl}/api/${this.apiVersion}/generate-content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ voiceProfile, sourceContent, postType }),
            });

            return await this.processResponse(response);
        } catch (error) {
            console.error('Error generating content:', error);
            throw error;
        }
    }

    /**
     * Get approval queue
     * @returns {Promise} - Approval queue
     */
    async getApprovalQueue() {
        try {
            const response = await fetch(`${this.baseUrl}/api/${this.apiVersion}/approval-queue`);

            return await this.processResponse(response);
        } catch (error) {
            console.error('Error fetching approval queue:', error);
            throw error;
        }
    }

    /**
     * Approve post
     * @param {string|number} postId - Post ID to approve
     * @param {Object} edits - Optional edits to the post
     * @returns {Promise} - Approval result
     */
    async approvePost(postId, edits = null) {
        try {
            const response = await fetch(`${this.baseUrl}/api/${this.apiVersion}/approve-post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ postId, edits }),
            });

            return await this.processResponse(response);
        } catch (error) {
            console.error('Error approving post:', error);
            throw error;
        }
    }

    /**
     * Save post as draft
     * @param {Object} post - Post to save as draft
     * @returns {Promise} - Draft save result
     */
    async saveDraft(post) {
        try {
            const response = await fetch(`${this.baseUrl}/api/${this.apiVersion}/save-draft`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ post }),
            });

            return await this.processResponse(response);
        } catch (error) {
            console.error('Error saving draft:', error);
            throw error;
        }
    }

    /**
     * Get analytics data
     * @returns {Promise} - Analytics data
     */
    async getAnalytics() {
        try {
            const response = await fetch(`${this.baseUrl}/api/${this.apiVersion}/analytics`);

            return await this.processResponse(response);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            throw error;
        }
    }
    
    /**
     * Analyze previous posts and generate news summary in one step
     * @param {string} previousPosts - Previous LinkedIn posts for style analysis
     * @param {Object} newsContent - News content to summarize
     * @param {string} summaryLength - Desired length of the summary (short, medium, long)
     * @returns {Promise} - Generated content with style analysis
     */
    async analyzeGenerateNews(previousPosts, newsContent, summaryLength = 'medium') {
        try {
            const response = await fetch(`${this.baseUrl}/api/${this.apiVersion}/analyze-generate-news`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    previousPosts, 
                    newsContent, 
                    summaryLength 
                }),
            });

            return await this.processResponse(response);
        } catch (error) {
            console.error('Error generating news summary:', error);
            throw error;
        }
    }
};
