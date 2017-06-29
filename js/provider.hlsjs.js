webpackJsonpjwplayer([2],{

/***/ 76:
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(52),
	    __webpack_require__(46),
	    __webpack_require__(50),
	    __webpack_require__(43),
	    __webpack_require__(44),
	    __webpack_require__(61),
	    __webpack_require__(67),
	    __webpack_require__(45)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function(cssUtils, utils, dom, _, events, states, DefaultProvider, Events) {

	    var clearTimeout = window.clearTimeout,
	      STALL_DELAY = 256,
	      _isIE = utils.isIE(),
	      _isMSIE = utils.isMSIE(),
	      _isMobile = utils.isMobile(),
	      _isFirefox = utils.isFF(),
	      _isAndroid = utils.isAndroidNative(),
	      _isIOS7 = utils.isIOS(7),
	      _isIOS8 = utils.isIOS(8),
	      _name = 'hlsjs';


	    function _setupListeners(eventsHash, videoTag) {
	        utils.foreach(eventsHash, function(evt, evtCallback) {
	            videoTag.addEventListener(evt, evtCallback, false);
	        });
	    }

	    function _removeListeners(eventsHash, videoTag) {
	        utils.foreach(eventsHash, function(evt, evtCallback) {
	            videoTag.removeEventListener(evt, evtCallback, false);
	        });
	    }

	    function HLSJSProvider(_playerId) {

	        // Current media state
	        this.state = states.IDLE;

	        // Are we buffering due to seek, or due to playback?
	        this.seeking = false;

	        _.extend(this, Events);

	        // Overwrite the event dispatchers to block on certain occasions
	        this.trigger = function(type, args) {
	            if (!_attached) {
	                return;
	            }
	            return Events.trigger.call(this, type, args);
	        };

	        this.setState = function(state) {
	            if (!_attached) {
	                return;
	            }
	            return DefaultProvider.setState.call(this, state);
	        };

	        var _this = this,
	          _mediaEvents = {
	              //abort: _generalHandler,
	              click : _clickHandler,
	              durationchange: _durationChangeHandler,
	              //emptied: _generalHandler,
	              ended: _endedHandler,
	              error: _errorHandler,

	              //play: _onPlayHandler, // play is attempted, but hasn't necessarily started
	              loadstart: _onLoadStart,
	              loadeddata: _onLoadedData, // we have video tracks (text, audio, metadata)
	              loadedmetadata: _loadedMetadataHandler, // we have video dimensions
	              canplay: _canPlayHandler,
	              playing: _playingHandler,
	              progress: _progressHandler,

	              pause: _pauseHandler,
	              seeked: _seekedHandler,
	              timeupdate: _timeUpdateHandler,
	              volumechange: _volumeChangeHandler,

	              webkitbeginfullscreen: _fullscreenBeginHandler,
	              webkitendfullscreen: _fullscreenEndHandler
	          },
	        // DOM container
	          _container,
	        // Current duration
	          _duration,
	        // Current position
	          _position,
	        // Whether seeking is ready yet
	          _canSeek = false,
	        // Whether we have sent out the BUFFER_FULL event
	          _bufferFull,
	        // If we should seek on canplay
	          _delayedSeek = 0,
	        // Using setInterval to check buffered ranges
	          _playbackTimeout = -1,
	        // Last sent buffer amount
	          _buffered = -1,
	        // Whether or not we're listening to video tag events
	          _attached = true,
	        // Quality levels
	          _levels = [],
	        // Current quality level index
	          _currentQuality = 0,
	        // Audio levels
	          _audioTracks = [],
	        // Current quality level index
	          _currentAudioTrack = 0,
	        // android hls doesn't update currentTime so we want to skip the stall check since it always fails
	          _isAndroidHLS = null,
	        // post roll support
	          _beforecompleted = false,
	        // webkit fullscreen media element state
	          _fullscreenState = false,
	        // MediaElement Tracks
	          _itemTracks = null,
	          _visualQuality = { level: {}},
	          _hlsLib = null,
	          _isLiveStream = false,
	          _currentItem= {};

	        // Find video tag, or create it if it doesn't exist.  View may not be built yet.

	        var element = document.getElementById(_playerId);
	        var _videotag = (element) ? element.querySelector('video') : undefined;
	        _videotag = _videotag || document.createElement('video');
	        _videotag.className = 'jw-video jw-reset';

	        if (!_isIOS7) {
	            _videotag.controls = true;
	            _videotag.controls = false;
	        }

	        // Enable AirPlay
	        _videotag.setAttribute('x-webkit-airplay', 'allow');
	        _videotag.setAttribute('webkit-playsinline', '');
	        _videotag.setAttribute('playsinline', '');

	        function _loadLibHls(){
	            var config = {
	                autoStartLoad : true,
	                capLevelToPlayerSize: false,
	                debug : false,
	                defaultAudioCodec : undefined,
	                maxBufferLength : 300,
	                maxMaxBufferLength : 1200,
	                maxBufferSize : 100*1000*1000,
	                maxBufferHole : 0.3,
	                maxSeekHole : 2,
	                seekHoleNudgeDuration : 0.01,
	                maxFragLookUpTolerance : 0.2,
	                liveSyncDurationCount : 3,
	                liveMaxLatencyDurationCount: 10,
	                enableWorker : true,
	                enableSoftwareAES: true,
	                manifestLoadingTimeOut : 10000,
	                manifestLoadingMaxRetry : 6,
	                manifestLoadingRetryDelay : 500,
	                levelLoadingTimeOut : 10000,
	                levelLoadingMaxRetry : 6,
	                levelLoadingRetryDelay : 500,
	                fragLoadingTimeOut : 20000,
	                fragLoadingMaxRetry : 6,
	                fragLoadingRetryDelay : 500,
	                startFragPrefech : false,
	                appendErrorMaxRetry : 3,
	                enableCEA708Captions: true
	            };
	            try {
	                _removeListeners(_mediaEvents, _videotag);
	            } catch (e){}

	            _setupListeners(_mediaEvents, _videotag);
	            _hlsLib = new Hls(config);
	            _hlsLib.attachMedia(_videotag);

	            _hlsLib.on(Hls.Events.MANIFEST_PARSED, _hlsMainfestParsed);
	            _hlsLib.on(Hls.Events.MANIFEST_LOADED, _hlsMainfestLoaded);
	            
	            _hlsLib.on(Hls.Events.LEVEL_SWITCH, _hlsLevelSwitch);
	            _hlsLib.on(Hls.Events.LEVEL_LOADED, _hlsLevelLoaded);
	            _hlsLib.on(Hls.Events.ERROR, _hlsError);
	        }

	        function _hlsLevelLoaded (event , data){
	            if (data.live === true) {
	                _isLiveStream = true;
	            } else {
	                _isLiveStream = false;
	            }
	        }
	        function _hlsMainfestLoaded (event , data){
	            if (data){
	                _audioTracks = data.audioTracks || [];
	                if (_audioTracks.length > 1){
	                    _currentAudioTrack = _hlsLib.audioTrack;
	                    _this.trigger(events.JWPLAYER_AUDIO_TRACKS, {
	                        tracks: _audioTracks,
	                        currentTrack: _currentAudioTrack
	                    });
	                } 
	            }
	        }
	        function _hlsMainfestParsed (event , data){
	            _levels = data.levels || [];
	            _levels = _getPublicLevels(_levels);
	            if (_levels.length > 1){
	                _levels.reverse();
	                _levels.push({'label': 'Auto'});
	                if (_hlsLib.autoLevelEnabled){
	                    _currentQuality = _hlsLib.levels.length;
	                } else{
	                    _currentQuality = _hlsLib.levels.length - 1 - _hlsLib.currentLevel;
	                }
	                _this.trigger(events.JWPLAYER_MEDIA_LEVELS, {
	                    levels: _levels,
	                    currentQuality: _currentQuality
	                });
	            }
	        }
	        function _hlsLevelSwitch (event, data){
	            if (_levels.length > 1) {
	                _levels.push({'label': 'Auto'});
	                if (_hlsLib.autoLevelEnabled){
	                    _currentQuality = _hlsLib.levels.length;
	                } else {
	                    _currentQuality = _hlsLib.levels.length - 1 - data.level ;
	                }
	                _this.trigger(events.JWPLAYER_MEDIA_LEVEL_CHANGED, {
	                    currentQuality: _currentQuality,
	                    levels: _getPublicLevels(_levels)
	                });
	            }
	        }
	        function _hlsError (event , data){
	            if(data.fatal) {
	                switch (data.type) {
	                    case Hls.ErrorTypes.NETWORK_ERROR:
	                        if (data.response && (data.response.code === 404 || data.response.code === 428)){
	                            _errorHandler(data);
	                            if (_hlsLib){
	                                _hlsLib.destroy();
	                                _hlsLib = null;
	                            }
	                        } else {
	                            _hlsLib.startLoad();
	                        }
	                        break;
	                    case Hls.ErrorTypes.MEDIA_ERROR:
	                        _hlsLib.recoverMediaError();
	                        break;
	                    default:
	                        _errorHandler(data);
	                        if (_hlsLib){
	                            _hlsLib.destroy();
	                            _hlsLib = null;
	                        }
	                        break;
	                }
	            }
	        }

	        function _onLoadedData() {
	            if (!_attached) {
	                return;
	            }
	            _videotag.setAttribute('jw-loaded', 'data');
	        }

	        function _onLoadStart() {
	            if (!_attached) {
	                return;
	            }
	            _videotag.setAttribute('jw-loaded', 'started');
	        }

	        function _clickHandler(evt) {
	            _this.trigger('click', evt);
	        }

	        function _durationChangeHandler() {
	            if (!_attached || _isAndroidHLS) {
	                return;
	            }

	            _updateDuration(_getDuration());
	            _setBuffered(_getBuffer(), _position, _duration);
	        }

	        function _progressHandler() {
	            if (!_attached) {
	                return;
	            }

	            _setBuffered(_getBuffer(), _position, _duration);
	        }

	        function _timeUpdateHandler() {
	            clearTimeout(_playbackTimeout);
	            _canSeek = true;
	            if (!_attached) {
	                return;
	            }
	            if (_this.state === states.STALLED) {
	                _this.setState(states.PLAYING);
	            } else if (_this.state === states.PLAYING) {
	                _playbackTimeout = setTimeout(_checkPlaybackStalled, STALL_DELAY);
	            }
	            // When video has not yet started playing for androidHLS, we cannot get the correct duration
	            if (_isAndroidHLS && (_videotag.duration === Infinity) && (_videotag.currentTime === 0)) {
	                return;
	            }
	            _updateDuration(_getDuration());
	            _setPosition(_videotag.currentTime);
	            // bffer ranges change during playback, not just on file progressu
	            _setBuffered(_getBuffer(), _position, _duration);

	            // send time events when playing
	            if (_this.state === states.PLAYING) {
	                _this.trigger(events.JWPLAYER_MEDIA_TIME, {
	                    position: _position,
	                    duration: _duration
	                });
	            }
	        }


	        function _setBuffered(buffered, currentTime, duration) {
	            if (buffered !== _buffered || duration !== _duration) {
	                _buffered = buffered;
	                _this.trigger(events.JWPLAYER_MEDIA_BUFFER, {
	                    bufferPercent: buffered * 100,
	                    position: currentTime,
	                    duration: duration
	                });
	            }
	        }

	        function _setPosition(currentTime) {
	            if (_duration < 0) {
	                currentTime = -(_getSeekableEnd() - currentTime);
	            }
	            _position = currentTime;
	        }

	        function _getDuration() {
	            var duration = _videotag.duration;
	            var end = _getSeekableEnd();
	            if (duration === Infinity && end) {
	                var seekableDuration = end - _videotag.seekable.start(0);
	                if (seekableDuration !== Infinity && seekableDuration > 120) {
	                    // Player interprets negative duration as DVR
	                    duration = -seekableDuration;
	                }
	            }
	            return duration;
	        }

	        function _updateDuration(duration) {
	            _duration = duration;
	            if (_delayedSeek && duration && duration !== Infinity) {
	                _this.seek(_delayedSeek);
	            }
	        }

	        function _sendMetaEvent() {
	            var duration = _getDuration();
	            if (_isAndroidHLS && duration === Infinity) {
	                duration = 0;
	            }
	            _this.trigger(events.JWPLAYER_MEDIA_META, {
	                duration: duration,
	                height: _videotag.videoHeight,
	                width: _videotag.videoWidth
	            });
	            _updateDuration(duration);
	        }

	        function _canPlayHandler() {
	            if (!_attached) {
	                return;
	            }

	            _canSeek = true;
	            _sendBufferFull();
	        }

	        function _loadedMetadataHandler() {
	            if (!_attached) {
	                return;
	            }

	            //fixes Chrome bug where it doesn't like being muted before video is loaded
	            if (_videotag.muted) {
	                _videotag.muted = false;
	                _videotag.muted = true;
	            }
	            _videotag.setAttribute('jw-loaded', 'meta');
	            _sendMetaEvent();
	        }

	        function _sendBufferFull() {
	            if (!_bufferFull) {
	                _bufferFull = true;
	                _this.trigger(events.JWPLAYER_MEDIA_BUFFER_FULL);
	            }
	        }

	        function _playingHandler() {
	            _this.setState(states.PLAYING);
	            if(!_videotag.hasAttribute('jw-played')) {
	                _videotag.setAttribute('jw-played','');
	            }
	            _this.trigger(events.JWPLAYER_PROVIDER_FIRST_FRAME, {});
	        }

	        function _pauseHandler() {
	            // Sometimes the browser will fire "complete" and then a "pause" event
	            if (_this.state === states.COMPLETE) {
	                return;
	            }

	            // If "pause" fires before "complete", we still don't want to propagate it
	            if (_videotag.currentTime === _videotag.duration) {
	                return;
	            }

	            _this.setState(states.PAUSED);
	        }

	        function _stalledHandler() {
	            // Android HLS doesnt update its times correctly so it always falls in here.  Do not allow it to stall.
	            if (_isAndroidHLS) {
	                return;
	            }

	            if (_videotag.paused || _videotag.ended) {
	                return;
	            }

	            // A stall after loading/error, should just stay loading/error
	            if (_this.state === states.LOADING || _this.state === states.ERROR) {
	                return;
	            }

	            // During seek we stay in paused state
	            if (_this.seeking) {
	                return;
	            }

	            _this.setState(states.STALLED);
	        }

	        function _errorHandler(data) {
	            if (!_attached) {
	                return;
	            }
	            var source = _currentItem.sources[0] || _currentItem;
	            _this.trigger(events.JWPLAYER_MEDIA_ERROR, {
	                message: 'Error loading media: File could not be played',
	                data : data || {}
	            });
	            utils.log('Error playing media: %s', source.file);
	        }
	        function _levelMapsBitrate(bitrate){
	            if (!bitrate){
	                return undefined;
	            }
	            return Math.round(bitrate / 1024) + 'kb';
	        }
	        function _levelMapsWidth(width){
	            if (!width){
	                return undefined;
	            }
	            var strCap = '';
	            if (width > 1792){
	                return '1080p+' + strCap;
	            }
	            if (width > 1280){
	                return '1080p' + strCap;
	            }
	            if (width > 1024){
	                return '720p' + strCap;
	            }
	            if (width > 800){
	                return '576p' + strCap;
	            }
	            if (width > 640){
	                return '480p' + strCap;
	            }
	            if (width > 480){
	                return '360p' + strCap;
	            }
	            if (width > 320){
	                return '240p' + strCap;
	            }
	            return undefined;
	        }
	        function _getPublicLevels(levels) {
	            var publicLevels;
	            if (utils.typeOf(levels) === 'array' && levels.length > 0) {
	                publicLevels = _.map(levels, function(level) {
	                    return {
	                        label: level.name || level.label || _levelMapsWidth(level.width) ||
	                                 _levelMapsBitrate(level.bitrate) || 'Unknow'
	                    };
	                });
	            }
	            return publicLevels;
	        }

	        function _completeLoad(startTime) {

	            _delayedSeek = 0;
	            clearTimeout(_playbackTimeout);
	            var hasPlayed = _videotag.hasAttribute('jw-played');
	            if (startTime === 0 && _videotag.currentTime > 0) {
	                // restart video without dispatching seek event
	                _delayedSeek = -1;
	                _this.seek(startTime);
	            }

	            _videotag.play();
	            _position = _videotag.currentTime;

	            if (_isMobile && !hasPlayed) {
	                // results in html5.controller calling video.play()
	                _sendBufferFull();
	                // If we're still paused, then the tag isn't loading yet due to mobile interaction restrictions.
	                if(!_videotag.paused && _this.state !== states.PLAYING){
	                    _this.setState(states.LOADING);
	                }
	            }

	            //in ios and fullscreen, set controls true, then when it goes to normal screen the controls don't show'
	            if (utils.isIOS() && _this.getFullScreen()) {
	                _videotag.controls = true;
	            }

	            if (startTime > 0) {
	                _this.seek(startTime);
	            }
	        }

	        function _clearVideotagSource() {
	            if (_videotag) {
	                _videotag.removeAttribute('crossorigin');
	                _videotag.removeAttribute('preload');
	                _videotag.removeAttribute('src');
	                _videotag.removeAttribute('jw-loaded');
	                _videotag.removeAttribute('jw-played');

	                dom.emptyElement(_videotag);
	                _currentQuality = 0;
	                _itemTracks = null;
	                // Don't call load in iE9/10 and check for load in PhantomJS
	                if (!_isMSIE && 'load' in _videotag) {
	                    _videotag.load();
	                }
	            }
	            if (_hlsLib){
	                _hlsLib.destroy();
	                _hlsLib = null;
	            }
	        }

	        function _getSeekableStart() {
	            var index = _videotag.seekable ? _videotag.seekable.length : 0;
	            var start = Infinity;

	            while(index--) {
	                start = Math.min(start, _videotag.seekable.start(index));
	            }
	            return start;
	        }

	        function _getSeekableEnd() {
	            var index = _videotag.seekable ? _videotag.seekable.length : 0;
	            var end = 0;

	            while(index--) {
	                end = Math.max(end, _videotag.seekable.end(index));
	            }
	            return end;
	        }

	        this.stop = function() {
	            clearTimeout(_playbackTimeout);
	            if (!_attached) {
	                return;
	            }
	            _clearVideotagSource();
	            // IE may continue to play a video after changing source and loading a new media file.
	            // https://connect.microsoft.com/IE/feedbackdetail/view/2000141/htmlmediaelement-autoplays-after-src-is-changed-and-load-is-called
	            if(utils.isIETrident()) {
	                _videotag.pause();
	            }
	            this.setState(states.IDLE);
	        };


	        this.destroy = function() {
	            _removeListeners(_mediaEvents, _videotag);
	            this.remove();
	            this.off();
	        };

	        this.init = function(item) {
	            if (!_attached) {
	                return;
	            }
	            _itemTracks = null;
	            _position = item.starttime || 0;
	            _duration = item.duration || 0;
	            _visualQuality.reason = '';
	        };

	        this.load = function(item) {
	            if (!_attached) {
	                return;
	            }
	            _isLiveStream = false;
	            if (_hlsLib === null){
	                _loadLibHls();
	            }

	            _currentItem = item;
	            var source = item.sources[0] || item;
	            _hlsLib.loadSource(source.file);
	            _videotag.setAttribute('jw-loaded', 'none');

	            if (!_isMobile || _videotag.hasAttribute('jw-played')) {
	                // don't change state on mobile before user initiates playback
	                _this.setState(states.LOADING);
	            }
	            _completeLoad(item.starttime || 0, item.duration || 0);
	        };

	        this.play = function() {
	            if (_this.seeking) {
	                _this.setState(states.LOADING);
	                _this.once(events.JWPLAYER_MEDIA_SEEKED, _this.play);
	                return;
	            }
	            _videotag.play();
	        };

	        this.pause = function() {
	            clearTimeout(_playbackTimeout);
	            _videotag.pause();
	            this.setState(states.PAUSED);
	        };

	        this.seek = function(seekPos) {
	            if (!_attached) {
	                return;
	            }

	            if (seekPos < 0) {
	                seekPos += _getSeekableStart() + _getSeekableEnd();
	            }

	            if (_delayedSeek === 0) {
	                this.trigger(events.JWPLAYER_MEDIA_SEEK, {
	                    position: _videotag.currentTime,
	                    offset: seekPos
	                });
	            }
	            if (!_canSeek) {
	                _canSeek = !!_getSeekableEnd();
	            }
	            if (_canSeek) {
	                _delayedSeek = 0;
	                // setting currentTime can throw an invalid DOM state exception if the video is not ready
	                try {
	                    _this.seeking = true;
	                    _videotag.currentTime = seekPos;
	                } catch(e) {
	                    _this.seeking = false;
	                    _delayedSeek = seekPos;
	                }
	            } else {
	                _delayedSeek = seekPos;
	                // Firefox isn't firing canplay event when in a paused state
	                // https://bugzilla.mozilla.org/show_bug.cgi?id=1194624
	                if (_isFirefox && _videotag.paused) {
	                    _videotag.play();
	                }
	            }
	        };

	        function _seekedHandler() {
	            _this.seeking = false;
	            _this.trigger(events.JWPLAYER_MEDIA_SEEKED);
	        }

	        this.volume = function(vol) {
	            // volume must be 0.0 - 1.0
	            vol = utils.between(vol/100, 0, 1);

	            _videotag.volume = vol;
	        };

	        function _volumeChangeHandler() {
	            _this.trigger('volume', {
	                volume: Math.round(_videotag.volume * 100)
	            });
	            _this.trigger('mute', {
	                mute: _videotag.muted
	            });
	        }

	        this.mute = function(state) {
	            _videotag.muted = !!state;
	        };

	        function _checkPlaybackStalled() {
	            // Browsers, including latest chrome, do not always report Stalled events in a timely fashion
	            if (_videotag.currentTime === _position) {
	                _stalledHandler();
	            }
	        }

	        function _getBuffer() {
	            var buffered = _videotag.buffered;
	            var duration = _videotag.duration;
	            if (!buffered || buffered.length === 0 || duration <= 0 || duration === Infinity) {
	                return 0;
	            }
	            return utils.between(buffered.end(buffered.length-1) / duration, 0, 1);
	        }

	        function _endedHandler() {
	            if (!_attached) {
	                return;
	            }
	            if (_this.state !== states.IDLE && _this.state !== states.COMPLETE) {
	                clearTimeout(_playbackTimeout);
	                _currentQuality = 0;
	                _beforecompleted = true;

	                _this.trigger(events.JWPLAYER_MEDIA_BEFORECOMPLETE);
	                // This event may trigger the detaching of the player
	                //  In that case, playback isn't complete until the player is re-attached
	                if (!_attached) {
	                    return;
	                }

	                _playbackComplete();
	            }
	        }

	        function _playbackComplete() {
	            clearTimeout(_playbackTimeout);
	            _this.setState(states.COMPLETE);
	            _beforecompleted = false;
	            _this.trigger(events.JWPLAYER_MEDIA_COMPLETE);

	        }

	        function _fullscreenBeginHandler(e) {
	            _fullscreenState = true;
	            _sendFullscreen(e);
	            // show controls on begin fullscreen so that they are disabled properly at end
	            if (utils.isIOS()) {
	                _videotag.controls = false;
	            }
	        }

	        function _fullscreenEndHandler(e) {
	            _fullscreenState = false;
	            _sendFullscreen(e);
	            if (utils.isIOS()) {
	                _videotag.controls = false;
	            }
	        }

	        function _sendFullscreen(e) {
	            _this.trigger('fullscreenchange', {
	                target: e.target,
	                jwstate: _fullscreenState
	            });
	        }

	        this.checkComplete = function() {
	            return _beforecompleted;
	        };

	        /**
	         * Return the video tag and stop listening to events
	         */
	        this.detachMedia = function() {
	            clearTimeout(_playbackTimeout);
	            _attached = false;
	            return _videotag;
	        };

	        /**
	         * Begin listening to events again
	         */
	        this.attachMedia = function() {
	            _attached = true;
	            _canSeek = false;

	            // If we were mid-seek when detached, we want to allow it to resume
	            this.seeking = false;

	            // In case the video tag was modified while we shared it
	            _videotag.loop = false;

	            // This is after a postroll completes
	            if (_beforecompleted) {
	                _playbackComplete();
	            }
	        };

	        this.setContainer = function(element) {
	            _container = element;
	            element.appendChild(_videotag);
	        };

	        this.getContainer = function() {
	            return _container;
	        };

	        this.remove = function() {
	            // stop video silently
	            _clearVideotagSource();
	            clearTimeout(_playbackTimeout);

	            // remove
	            if (_container === _videotag.parentNode) {
	                _container.removeChild(_videotag);
	            }
	        };

	        this.setVisibility = function(state) {
	            state = !!state;
	            if (state || _isAndroid) {
	                // Changing visibility to hidden on Android < 4.2 causes
	                // the pause event to be fired. This causes audio files to
	                // become unplayable. Hence the video tag is always kept
	                // visible on Android devices.
	                cssUtils.style(_container, {
	                    visibility: 'visible',
	                    opacity: 1
	                });
	            } else {
	                cssUtils.style(_container, {
	                    visibility: '',
	                    opacity: 0
	                });
	            }
	        };

	        this.resize = function(width, height, stretching) {
	            if (!width || !height || !_videotag.videoWidth || !_videotag.videoHeight) {
	                return false;
	            }
	            var style = {
	                objectFit: ''
	            };
	            if (stretching === 'uniform') {
	                // snap video to edges when the difference in aspect ratio is less than 9%
	                var playerAspectRatio = width / height;
	                var videoAspectRatio = _videotag.videoWidth / _videotag.videoHeight;
	                if (Math.abs(playerAspectRatio - videoAspectRatio) < 0.09) {
	                    style.objectFit = 'fill';
	                    stretching = 'exactfit';
	                }
	            }
	            // Prior to iOS 9, object-fit worked poorly
	            // object-fit is not implemented in IE or Android Browser in 4.4 and lower
	            // http://caniuse.com/#feat=object-fit
	            // feature detection may work for IE but not for browsers where object-fit works for images only
	            var fitVideoUsingTransforms = _isIE || _isAndroid || _isIOS7 || _isIOS8;
	            if (fitVideoUsingTransforms) {
	                // Use transforms to center and scale video in container
	                var x = - Math.floor(_videotag.videoWidth  / 2 + 1);
	                var y = - Math.floor(_videotag.videoHeight / 2 + 1);
	                var scaleX = Math.ceil(width  * 100 / _videotag.videoWidth)  / 100;
	                var scaleY = Math.ceil(height * 100 / _videotag.videoHeight) / 100;
	                if (stretching === 'none') {
	                    scaleX = scaleY = 1;
	                } else if (stretching === 'fill') {
	                    scaleX = scaleY = Math.max(scaleX, scaleY);
	                } else if (stretching === 'uniform') {
	                    scaleX = scaleY = Math.min(scaleX, scaleY);
	                }
	                style.width  = _videotag.videoWidth;
	                style.height = _videotag.videoHeight;
	                style.top = style.left = '50%';
	                style.margin  = 0;
	                cssUtils.transform(_videotag,
	                  'translate(' + x + 'px, ' + y + 'px) scale(' + scaleX.toFixed(2) + ', ' + scaleY.toFixed(2) + ')');
	            }
	            cssUtils.style(_videotag, style);
	            return false;
	        };

	        this.setFullscreen = function(state) {
	            state = !!state;
	            // This implementation is for iOS and Android WebKit only
	            // This won't get called if the player container can go fullscreen
	            if (state) {
	                var status = utils.tryCatch(function() {
	                    var enterFullscreen =
	                      _videotag.webkitEnterFullscreen ||
	                      _videotag.webkitEnterFullScreen;
	                    if (enterFullscreen) {
	                        enterFullscreen.apply(_videotag);
	                    }

	                });

	                if (status instanceof utils.Error) {
	                    //object can't go fullscreen
	                    return false;
	                }

	                return _this.getFullScreen();

	            } else {
	                var exitFullscreen =
	                  _videotag.webkitExitFullscreen ||
	                  _videotag.webkitExitFullScreen;
	                if (exitFullscreen) {
	                    exitFullscreen.apply(_videotag);
	                }
	            }

	            return state;
	        };

	        _this.getFullScreen = function() {
	            return _fullscreenState || !!_videotag.webkitDisplayingFullscreen;
	        };

	        this.setCurrentQuality = function(quality) {
	            if (_hlsLib !== null) {
	                //_hlsLib.currentLevel = _hlsLib.levels.length - quality - 1;
	                _hlsLib.nextLevel = _hlsLib.levels.length - quality - 1;
	            }
	        };

	        this.getCurrentQuality = function() {
	            return _currentQuality;
	        };

	        this.getQualityLevels = function() {
	            return _getPublicLevels(_levels);
	        };

	        this.getAudioTracks = function() {
	            return _audioTracks;
	        };

	        this.getCurrentAudioTrack = function () {
	            return _currentAudioTrack;
	        };

	        this.setCurrentAudioTrack = function(audioTrack) {
	            if (_hlsLib !== null) {
	                _hlsLib.audioTrack = audioTrack;
	            }
	        };

	        this.getName = function() {
	            return { name : _name };
	        };

	        this.sendEvent = function(){

	        };

	        this.setMouse = function(){

	        };

	        this.setSpeed = function (speed) {
	            _videotag.playbackRate = speed;
	            _videotag.defaultPlaybackRate = speed;
	            if(navigator.userAgent.toLowerCase().indexOf('firefox') > -1){
	                _this.seek(_position);
	            }
	        };

	    }

	    // Register provider
	    var F = function(){};
	    F.prototype = DefaultProvider;
	    HLSJSProvider.prototype = new F();

	    HLSJSProvider.getName = function() {
	        return { name : 'hlsjs' };
	    };

	    HLSJSProvider.supports = function(item) {
	        var type = item.type;
	        if (typeof(Hls) !== 'undefined' && Hls.isSupported() === true && (type === 'hlsjs' || type === 'm3u8')){
	            return true;
	        }
	        return false;
	    };
	    return HLSJSProvider;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ })

});
//# sourceMappingURL=provider.hlsjs.8ef7cd9b5532eec45d78.map