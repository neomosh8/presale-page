/**
 * OneSpark Campaign Video Analytics Script
 * Provides detailed analytics for campaign video including:
 * - View counts and unique viewers
 * - Chapter-based tracking (problem, solution, demo, benefits, features, closing)
 * - Pause/play/seek behavior
 * - Viewing heatmap data
 * - Session tracking
 * 
 * Integrates with Google Analytics 4 (GA4)
 */

// Self-executing function to avoid polluting global namespace
(function() {
  // Define video chapters
  const videoChapters = [
    { id: 'problem', name: 'Problem Statement', start: 0, end: 22 },
    { id: 'solution', name: 'Solution Overview', start: 22, end: 30 },
    { id: 'demo', name: 'Product Demo', start: 30, end: 50 },
    { id: 'benefits', name: 'Key Benefits', start: 50, end: 60 },
    { id: 'features', name: 'Feature Showcase', start: 60, end: 100 },
    { id: 'closing', name: 'Closing Message', start: 100, end: Infinity }
  ];

  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', function() {

    
    // Target the main campaign video
    const campaignVideo = document.querySelector('.product-video video');
    
    // Exit if video element isn't found or gtag isn't available
    if (!campaignVideo || typeof gtag !== 'function') {
      console.warn('Campaign video tracking: Video element not found or Google Analytics not loaded');
      return;
    }
    
    // Initialize tracking state
    const trackingState = {
      videoId: 'campaign-main-video',
      videoTitle: 'OneSpark Campaign Main Video',
      sessionId: generateSessionId(),
      trackedChapters: {}, // Track which chapters were viewed and completed
      videoStarted: false,
      videoCompleted: false,
      lastPosition: 0,
      lastUpdateTime: Date.now(),
      playbackHistory: [],
      // Configuration
      heatmapResolution: 1, // Record position every 1 second for heatmap
      heatmapData: {},
      watchDuration: 0,
      lastPlayheadPosition: 0,
      playbackRate: 1
    };
    
    // Helper function: Get current chapter based on timestamp
    function getCurrentChapter(currentTime) {
      return videoChapters.find(chapter => 
        currentTime >= chapter.start && currentTime < chapter.end
      ) || { id: 'unknown', name: 'Unknown Section' };
    }
    
    // Generate a unique session ID for this viewing session
    function generateSessionId() {
      return 'vid_' + Math.random().toString(36).substring(2, 15) + 
             '_' + Date.now().toString(36);
    }
    
    // Format time in MM:SS
    function formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
    
    // Track when video metadata is loaded (video is ready)
    campaignVideo.addEventListener('loadedmetadata', function() {
      gtag('event', 'video_ready', {
        'event_category': 'Video',
        'event_label': trackingState.videoTitle,
        'video_id': trackingState.videoId,
        'video_duration': campaignVideo.duration,
        'session_id': trackingState.sessionId
      });
    });
    
    // Track when video starts playing (first play only)
    campaignVideo.addEventListener('play', function() {
      trackingState.playbackRate = campaignVideo.playbackRate;
      const currentChapter = getCurrentChapter(campaignVideo.currentTime);
      
      if (!trackingState.videoStarted) {
        trackingState.videoStarted = true;
        gtag('event', 'video_start', {
          'event_category': 'Video',
          'event_label': trackingState.videoTitle,
          'video_id': trackingState.videoId,
          'video_duration': campaignVideo.duration,
          'video_position': campaignVideo.currentTime,
          'current_chapter': currentChapter.name,
          'session_id': trackingState.sessionId
        });
        
        // Also count as a general video view
        gtag('event', 'video_view', {
          'event_category': 'Video',
          'event_label': trackingState.videoTitle,
          'video_id': trackingState.videoId
        });
      } else {
        // Resume after pause
        gtag('event', 'video_resume', {
          'event_category': 'Video',
          'event_label': trackingState.videoTitle,
          'video_id': trackingState.videoId,
          'video_position': campaignVideo.currentTime,
          'video_position_percent': Math.floor((campaignVideo.currentTime / campaignVideo.duration) * 100),
          'current_chapter': currentChapter.name,
          'session_id': trackingState.sessionId
        });
      }
      
      // Record playhead position for accurate duration tracking
      trackingState.lastPlayheadPosition = campaignVideo.currentTime;
      trackingState.lastUpdateTime = Date.now();
    });
    
    // Combined timeupdate handler for chapter tracking and heatmap
    campaignVideo.addEventListener('timeupdate', function() {
      const currentTime = campaignVideo.currentTime;
      const duration = campaignVideo.duration;
      
      // Chapter tracking
      videoChapters.forEach(chapter => {
        // Check if we're in this chapter
        if (currentTime >= chapter.start && currentTime < chapter.end) {
          // Check if we haven't tracked this chapter yet
          if (!trackingState.trackedChapters[chapter.id]) {
            trackingState.trackedChapters[chapter.id] = true;
            
            // Send chapter_view event to GA
            gtag('event', 'video_chapter_view', {
              'event_category': 'Video',
              'event_label': trackingState.videoTitle,
              'video_id': trackingState.videoId,
              'chapter_id': chapter.id,
              'chapter_name': chapter.name,
              'chapter_start_time': formatTime(chapter.start),
              'chapter_position': Math.floor((chapter.start / duration) * 100) + '%',
              'session_id': trackingState.sessionId
            });
          }
        }
        
        // Chapter completion tracking in the same loop
        if (currentTime >= chapter.end && 
            currentTime <= chapter.end + 1 && 
            trackingState.trackedChapters[chapter.id] && 
            !trackingState.trackedChapters[`${chapter.id}_completed`]) {
          
          // Mark this chapter as completed
          trackingState.trackedChapters[`${chapter.id}_completed`] = true;
          
          // Send chapter_complete event
          gtag('event', 'video_chapter_complete', {
            'event_category': 'Video',
            'event_label': trackingState.videoTitle,
            'video_id': trackingState.videoId,
            'chapter_id': chapter.id,
            'chapter_name': chapter.name,
            'session_id': trackingState.sessionId
          });
        }
      });
      
      // Only update heatmap data when playing (not when paused/seeking)
      if (!campaignVideo.paused) {
        // Record data for heatmap at specified resolution
        const timePosition = Math.floor(currentTime / trackingState.heatmapResolution) * trackingState.heatmapResolution;
        trackingState.heatmapData[timePosition] = (trackingState.heatmapData[timePosition] || 0) + 1;
        
        // Calculate genuine watch time (accounting for playback rate)
        const now = Date.now();
        const timeDiff = now - trackingState.lastUpdateTime;
        if (timeDiff > 0 && timeDiff < 2000) { // Ignore gaps larger than 2 seconds
          trackingState.watchDuration += (timeDiff / 1000) * trackingState.playbackRate;
        }
        trackingState.lastUpdateTime = now;
        trackingState.lastPlayheadPosition = currentTime;
      }
      
      // Track position for skip detection
      trackingState.playbackHistory.push({
        time: Date.now(),
        position: currentTime
      });
      
      // Trim history to last 10 entries
      if (trackingState.playbackHistory.length > 10) {
        trackingState.playbackHistory.shift();
      }
    });
    
    // Track when video is paused
    campaignVideo.addEventListener('pause', function() {
      // Don't track pause events at the very end (likely just completion)
      if (campaignVideo.currentTime < campaignVideo.duration - 0.5) {
        // Find current chapter
        const currentChapter = getCurrentChapter(campaignVideo.currentTime);
        
        gtag('event', 'video_pause', {
          'event_category': 'Video',
          'event_label': trackingState.videoTitle,
          'video_id': trackingState.videoId,
          'video_position': campaignVideo.currentTime,
          'video_position_percent': Math.floor((campaignVideo.currentTime / campaignVideo.duration) * 100),
          'current_chapter': currentChapter.name,
          'session_id': trackingState.sessionId,
          'watch_duration': Math.round(trackingState.watchDuration)
        });
      }
    });
    
    // Track when the video playback rate changes
    campaignVideo.addEventListener('ratechange', function() {
      const newRate = campaignVideo.playbackRate;
      const currentChapter = getCurrentChapter(campaignVideo.currentTime);
      
      gtag('event', 'video_rate_change', {
        'event_category': 'Video',
        'event_label': trackingState.videoTitle,
        'video_id': trackingState.videoId,
        'old_rate': trackingState.playbackRate,
        'new_rate': newRate,
        'current_chapter': currentChapter.name,
        'session_id': trackingState.sessionId
      });
      
      trackingState.playbackRate = newRate;
    });
    
    // Track when user seeks in the video
    campaignVideo.addEventListener('seeked', function() {
      const newPosition = campaignVideo.currentTime;
      const lastPosition = trackingState.lastPosition;
      const seekDistance = newPosition - lastPosition;
      
      // Skip tracking small seeks (often just normal buffering)
      if (Math.abs(seekDistance) > 2) {
        const seekDirection = seekDistance > 0 ? 'forward' : 'backward';
        const seekDistanceSeconds = Math.abs(seekDistance);
        const seekDistancePercent = Math.floor((seekDistanceSeconds / campaignVideo.duration) * 100);
        
        // Find chapters for both positions
        const fromChapter = getCurrentChapter(lastPosition);
        const toChapter = getCurrentChapter(newPosition);
        
        gtag('event', `video_seek_${seekDirection}`, {
          'event_category': 'Video',
          'event_label': trackingState.videoTitle,
          'video_id': trackingState.videoId,
          'seek_from_position': lastPosition,
          'seek_to_position': newPosition,
          'seek_distance_seconds': seekDistanceSeconds,
          'seek_distance_percent': seekDistancePercent,
          'from_chapter': fromChapter.name,
          'to_chapter': toChapter.name,
          'session_id': trackingState.sessionId
        });
        
        // Reset tracking flags for chapters we've seeked backward before
        if (seekDirection === 'backward') {
          videoChapters.forEach(chapter => {
            if (newPosition < chapter.start && trackingState.trackedChapters[chapter.id]) {
              trackingState.trackedChapters[chapter.id] = false;
              
              // Also reset completion tracking
              if (trackingState.trackedChapters[`${chapter.id}_completed`]) {
                trackingState.trackedChapters[`${chapter.id}_completed`] = false;
              }
            }
          });
        }
      }
      
      trackingState.lastPosition = newPosition;
    });
    
    // Track video completion
    campaignVideo.addEventListener('ended', function() {
      if (!trackingState.videoCompleted) {
        trackingState.videoCompleted = true;
        
        // Count which chapters were completed
        const completedChapters = videoChapters
          .filter(chapter => trackingState.trackedChapters[`${chapter.id}_completed`])
          .map(chapter => chapter.name);
        
        gtag('event', 'video_complete', {
          'event_category': 'Video',
          'event_label': trackingState.videoTitle,
          'video_id': trackingState.videoId,
          'video_duration': campaignVideo.duration,
          'watch_duration': Math.round(trackingState.watchDuration),
          'completed_chapters': completedChapters.join(', '),
          'completion_rate': (completedChapters.length / videoChapters.length).toFixed(2),
          'session_id': trackingState.sessionId
        });
      }
    });
    
    // Track when user leaves the page while video is playing
    window.addEventListener('beforeunload', function() {
      if (trackingState.videoStarted && !trackingState.videoCompleted && !campaignVideo.paused) {
        const currentChapter = getCurrentChapter(campaignVideo.currentTime);
        
        gtag('event', 'video_exit_during_playback', {
          'event_category': 'Video',
          'event_label': trackingState.videoTitle,
          'video_id': trackingState.videoId,
          'video_position': campaignVideo.currentTime,
          'video_position_percent': Math.floor((campaignVideo.currentTime / campaignVideo.duration) * 100),
          'current_chapter': currentChapter.name,
          'session_id': trackingState.sessionId,
          'watch_duration': Math.round(trackingState.watchDuration)
        });
      }
      
      // Send heatmap data on exit if we have substantial data
      if (Object.keys(trackingState.heatmapData).length > 5) {
        gtag('event', 'video_heatmap', {
          'event_category': 'Video',
          'event_label': trackingState.videoTitle,
          'video_id': trackingState.videoId,
          'session_id': trackingState.sessionId
          // Removed large heatmap_data to avoid exceeding GA parameter size limits
        });
      }
    });
    
    // Add custom controls for tracking user interaction with video controls
    campaignVideo.addEventListener('volumechange', function() {
      const currentChapter = getCurrentChapter(campaignVideo.currentTime);
      
      gtag('event', campaignVideo.muted ? 'video_muted' : 'video_volume_change', {
        'event_category': 'Video',
        'event_label': trackingState.videoTitle,
        'video_id': trackingState.videoId,
        'volume_level': campaignVideo.volume,
        'current_chapter': currentChapter.name,
        'session_id': trackingState.sessionId
      });
    });
    
    // Track fullscreen toggling
    campaignVideo.addEventListener('fullscreenchange', function() {
      const isFullScreen = document.fullscreenElement !== null;
      const currentChapter = getCurrentChapter(campaignVideo.currentTime);
      
      gtag('event', isFullScreen ? 'video_enter_fullscreen' : 'video_exit_fullscreen', {
        'event_category': 'Video',
        'event_label': trackingState.videoTitle,
        'video_id': trackingState.videoId,
        'video_position': campaignVideo.currentTime,
        'current_chapter': currentChapter.name,
        'session_id': trackingState.sessionId
      });
    });
    
    // Track errors
    campaignVideo.addEventListener('error', function() {
      gtag('event', 'video_error', {
        'event_category': 'Video',
        'event_label': trackingState.videoTitle,
        'video_id': trackingState.videoId,
        'error_code': campaignVideo.error ? campaignVideo.error.code : 'unknown',
        'session_id': trackingState.sessionId
      });
    });
    
    // Track if the user is actually viewing the video (visibility API)
    if (typeof document.hidden !== 'undefined') {
      document.addEventListener('visibilitychange', function() {
        if (document.hidden && !campaignVideo.paused) {
          const currentChapter = getCurrentChapter(campaignVideo.currentTime);
          
          gtag('event', 'video_background_play', {
            'event_category': 'Video',
            'event_label': trackingState.videoTitle,
            'video_id': trackingState.videoId,
            'video_position': campaignVideo.currentTime,
            'current_chapter': currentChapter.name,
            'session_id': trackingState.sessionId
          });
        }
      });
    }
    
    // Add intersection observer to detect when video is in viewport
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting && !campaignVideo.paused) {
            const currentChapter = getCurrentChapter(campaignVideo.currentTime);
            
            gtag('event', 'video_out_of_view_play', {
              'event_category': 'Video',
              'event_label': trackingState.videoTitle,
              'video_id': trackingState.videoId,
              'video_position': campaignVideo.currentTime,
              'current_chapter': currentChapter.name,
              'session_id': trackingState.sessionId
            });
          }
        });
      }, { threshold: 0.5 });
      
      observer.observe(campaignVideo);
    }
    
    console.log('Campaign video tracking initialized with chapters:', videoChapters.map(c => c.name).join(', '));
  });
})();