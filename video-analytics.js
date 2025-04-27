/**
 * OneSpark Campaign Video Analytics Script
 * Provides detailed analytics for campaign video including:
 * - View counts and unique viewers
 * - Progress tracking at 5% intervals
 * - Pause/play/seek behavior
 * - Viewing heatmap data
 * - Session tracking
 * 
 * Integrates with Google Analytics 4 (GA4)
 */

// Self-executing function to avoid polluting global namespace
(function() {
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
      trackedSegments: {},
      videoStarted: false,
      videoCompleted: false,
      lastPosition: 0,
      lastUpdateTime: Date.now(),
      playbackHistory: [],
      // Configuration
      segmentInterval: 5, // Track every 5% progress
      heatmapResolution: 1, // Record position every 1 second for heatmap
      heatmapData: {},
      watchDuration: 0,
      lastPlayheadPosition: 0,
      playbackRate: 1
    };
    
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
      
      if (!trackingState.videoStarted) {
        trackingState.videoStarted = true;
        gtag('event', 'video_start', {
          'event_category': 'Video',
          'event_label': trackingState.videoTitle,
          'video_id': trackingState.videoId,
          'video_duration': campaignVideo.duration,
          'video_position': campaignVideo.currentTime,
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
          'session_id': trackingState.sessionId
        });
      }
      
      // Record playhead position for accurate duration tracking
      trackingState.lastPlayheadPosition = campaignVideo.currentTime;
      trackingState.lastUpdateTime = Date.now();
    });
    
    // Track progress at specified intervals and record heatmap data
    campaignVideo.addEventListener('timeupdate', function() {
      const currentTime = campaignVideo.currentTime;
      const duration = campaignVideo.duration;
      const progressPercent = Math.floor((currentTime / duration) * 100);
      
      // Track segments based on configured interval
      for (let i = trackingState.segmentInterval; i <= 100; i += trackingState.segmentInterval) {
        if (progressPercent >= i && !trackingState.trackedSegments[i]) {
          trackingState.trackedSegments[i] = true;
          gtag('event', 'video_progress', {
            'event_category': 'Video',
            'event_label': trackingState.videoTitle,
            'video_id': trackingState.videoId,
            'video_percent': i,
            'video_time': formatTime(currentTime),
            'session_id': trackingState.sessionId
          });
        }
      }
      
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
        gtag('event', 'video_pause', {
          'event_category': 'Video',
          'event_label': trackingState.videoTitle,
          'video_id': trackingState.videoId,
          'video_position': campaignVideo.currentTime,
          'video_position_percent': Math.floor((campaignVideo.currentTime / campaignVideo.duration) * 100),
          'session_id': trackingState.sessionId,
          'watch_duration': Math.round(trackingState.watchDuration)
        });
      }
    });
    
    // Track when the video playback rate changes
    campaignVideo.addEventListener('ratechange', function() {
      const newRate = campaignVideo.playbackRate;
      
      gtag('event', 'video_rate_change', {
        'event_category': 'Video',
        'event_label': trackingState.videoTitle,
        'video_id': trackingState.videoId,
        'old_rate': trackingState.playbackRate,
        'new_rate': newRate,
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
        
        gtag('event', `video_seek_${seekDirection}`, {
          'event_category': 'Video',
          'event_label': trackingState.videoTitle,
          'video_id': trackingState.videoId,
          'seek_from_position': lastPosition,
          'seek_to_position': newPosition,
          'seek_distance_seconds': seekDistanceSeconds,
          'seek_distance_percent': seekDistancePercent,
          'session_id': trackingState.sessionId
        });
        
        // Reset tracking flags for segments we've seeked back before
        if (seekDirection === 'backward') {
          const currentPercent = Math.floor((newPosition / campaignVideo.duration) * 100);
          Object.keys(trackingState.trackedSegments).forEach(percent => {
            if (parseInt(percent) > currentPercent) {
              trackingState.trackedSegments[percent] = false;
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
        
        gtag('event', 'video_complete', {
          'event_category': 'Video',
          'event_label': trackingState.videoTitle,
          'video_id': trackingState.videoId,
          'video_duration': campaignVideo.duration,
          'watch_duration': Math.round(trackingState.watchDuration),
          'session_id': trackingState.sessionId,
          'heatmap_data': JSON.stringify(trackingState.heatmapData)
        });
      }
    });
    
    // Track when user leaves the page while video is playing
    window.addEventListener('beforeunload', function() {
      if (trackingState.videoStarted && !trackingState.videoCompleted && !campaignVideo.paused) {
        gtag('event', 'video_exit_during_playback', {
          'event_category': 'Video',
          'event_label': trackingState.videoTitle,
          'video_id': trackingState.videoId,
          'video_position': campaignVideo.currentTime,
          'video_position_percent': Math.floor((campaignVideo.currentTime / campaignVideo.duration) * 100),
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
          'session_id': trackingState.sessionId,
          'heatmap_data': JSON.stringify(trackingState.heatmapData)
        });
      }
    });
    
    // Add custom controls for tracking user interaction with video controls
    campaignVideo.addEventListener('volumechange', function() {
      gtag('event', campaignVideo.muted ? 'video_muted' : 'video_volume_change', {
        'event_category': 'Video',
        'event_label': trackingState.videoTitle,
        'video_id': trackingState.videoId,
        'volume_level': campaignVideo.volume,
        'session_id': trackingState.sessionId
      });
    });
    
    // Track fullscreen toggling
    campaignVideo.addEventListener('fullscreenchange', function() {
      const isFullScreen = document.fullscreenElement !== null;
      gtag('event', isFullScreen ? 'video_enter_fullscreen' : 'video_exit_fullscreen', {
        'event_category': 'Video',
        'event_label': trackingState.videoTitle,
        'video_id': trackingState.videoId,
        'video_position': campaignVideo.currentTime,
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
          gtag('event', 'video_background_play', {
            'event_category': 'Video',
            'event_label': trackingState.videoTitle,
            'video_id': trackingState.videoId,
            'video_position': campaignVideo.currentTime,
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
            gtag('event', 'video_out_of_view_play', {
              'event_category': 'Video',
              'event_label': trackingState.videoTitle,
              'video_id': trackingState.videoId,
              'video_position': campaignVideo.currentTime,
              'session_id': trackingState.sessionId
            });
          }
        });
      }, { threshold: 0.5 });
      
      observer.observe(campaignVideo);
    }
    
    console.log('Campaign video tracking initialized');
  });
})();