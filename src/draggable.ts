interface DraggableParameters {
  swipeOutThreshold: string;
  backTime: string; // Animation time for the transform 0
  swipeTime: string; // Animation time for the swipe
  type: SwipeType;
  swipeOut: boolean;
  swipeOutBy: string; // IN PIXELS OR PERCENTAGE 5 or 5px become 5 while 50% in a 100px containers becomes 50
  threshold: number; // Minimum amount of pixels of movement before a swipe is registered
  allowedDirection: AllowedDirection; // TODO: changed to 1 | -1 // TODO: Uncomment for direction
  debug: boolean;
  max: string | null;
  swipeAway: boolean;
  swipeAwayBy: string;
  swipeAwayThreshold: string;
  // TODO: Add "hold" preference
  // TODO: Add contemporary swipe to reveal and swipe away
}

const DefaultParameters: DraggableParameters = {
  swipeOutThreshold: '25%', // TODO: WON'T WORK
  backTime: '0.5s',
  swipeTime: '0.5s',
  type: 'horizontal',
  swipeOut: false,
  swipeOutBy: '50%',
  threshold: 5,
  allowedDirection: null, // TODO: Uncomment for direction
  debug: false,
  max: null,
  swipeAway: false,
  swipeAwayBy: '1000%',
  swipeAwayThreshold: '55%',
};

type SwipeType = 'horizontal' | 'vertical';
type AllowedDirection = 'top' | 'bottom' | 'left' | 'right' | null;

const Draggable: any = {
  bind: (el: any, binding: { value: DraggableParameters }, vnode: any) => {
    let detectedScroll: boolean | null = false;
    let swipedOut                      = false;

    const parameters = {...DefaultParameters, ...binding.value};

    const {
            swipeOutThreshold,
            backTime,
            swipeTime,
            type,
            swipeOut,
            swipeOutBy,
            threshold,
            allowedDirection, // TODO: Uncomment for direction
            debug,
            max,
            swipeAway,
            swipeAwayBy,
            swipeAwayThreshold,
          } = parameters;

    const AllowedDirectionNumber = GetAllowedDirectionSign(allowedDirection);

    const SwipeOutThresholdPixels = GetActualPixels(swipeOutThreshold, el, type);
    const SwipeOutByPixels = GetActualPixels(swipeOutBy, el, type);
    const SwipeAwayThresholdPixels = GetActualPixels(swipeAwayThreshold, el, type);
    const SwipeAwayByPixels = GetActualPixels(swipeAwayBy, el, type);
    let initialX = 0;
    let initialY = 0;

    el.addEventListener('touchstart', (e: any) => {

      if (type === 'vertical' && ((el.getBoundingClientRect().top - el.offsetTop) * AllowedDirectionNumber < 0)) {
        return;
      }

      const touchObj      = e.changedTouches[0];
      el.style.transition = 'none';
      if (!swipedOut) {
        initialX = touchObj.pageX;
        initialY = touchObj.pageY;
        Log(debug, 'START: starting', initialX, initialY);
      }
      else {
        Log(debug, 'START: starting (ALREADY OPEN)');
      }
    }, false);


    el.addEventListener('touchmove', (e: any) => {


      /**
       * Avoids any movement if the draggable element is (?) TODO
       */
      if (detectedScroll === null && type === 'vertical' && ((el.getBoundingClientRect().top - el.offsetTop) * AllowedDirectionNumber < 0)) {
        detectedScroll = true;
        return;
      }


      const touchObj = e.changedTouches[0];
      if (detectedScroll) {
        Log(debug, 'MOVE: detectedScroll');
        return;
      }
      if (
          ShouldSkip(type, touchObj.pageY, initialY, touchObj.pageX, initialX, threshold, debug)
          && detectedScroll == null
      ) {
        // detectedScroll = true;
        Log(debug, 'MOVE: shouldSkip');
        return;
      }

      let movedBy: number; // TODO: Explain
      let newMoveBy: number; // TODO: Explain

      if (type === 'horizontal') {
        movedBy = touchObj.pageX - initialX;
      }
      else {
        movedBy = touchObj.pageY - initialY;
      }


      /**
       * Flagging as a scroll if there was no movement in any allowed direction before
       */
      if (detectedScroll === null && AllowedDirectionNumber !== 0 && (AllowedDirectionNumber * movedBy) < 0) {
        detectedScroll = true;
        return;
      } // TODO: Describe
      detectedScroll = false; // TODO: CHECK

      if (e.cancelable) {
        e.preventDefault();
      } // TODO: CHECK
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (swipeOut && swipeOutBy) {
        const maxMoveBy = Math.max(
            SwipeOutByPixels,
            SwipeOutThresholdPixels,
            swipeAway ? SwipeAwayByPixels : 0,
        );
        newMoveBy       = maxMoveBy < Math.abs(movedBy) ? maxMoveBy : Math.abs(movedBy);
      }
      else if (swipeAway) {
        const maxMoveBy = GetActualPixels(swipeAwayBy, el, type);
        newMoveBy       = maxMoveBy < Math.abs(movedBy) ? maxMoveBy : Math.abs(movedBy);
      }
      else if (max) {
        const maxMoveBy = GetActualPixels(max, el, type);
        newMoveBy = maxMoveBy < Math.abs(movedBy) ? maxMoveBy : Math.abs(movedBy);
      }
      else {
        newMoveBy = Math.abs(movedBy);
      }

      Log(debug, movedBy, 'movedBy');

      requestAnimationFrame(() => {
        Log(debug, 'MOVE: translating');
        if (type === 'horizontal') {
          /* Horizontal swipe on X */
          if (allowedDirection === 'right' && movedBy < 0) {
            return;
          }

          if (allowedDirection === 'left' && movedBy > 0) {
            return;
          }

          el.style.transform = `translate3d(${Math.sign(movedBy) * newMoveBy}px, 0, 0)`;
        }
        else {
          /* vertical swipe on Y */
          if (allowedDirection === 'bottom' && movedBy < 0) {
            return;
          }

          if (allowedDirection === 'top' && movedBy > 0) {
            return;
          }

          if (detectedScroll === null) {
            detectedScroll = false;
          }
          el.style.transform = `translate3d(0, ${Math.sign(movedBy) * newMoveBy}px, 0)`;
        }
      });
      return false;
    }, false);

    el.addEventListener('touchend', (e: any) => {
      const touchObj = e.changedTouches[0];
      if (detectedScroll) {
        Log(debug, 'END: detectedscroll');
        detectedScroll = null;
        return;
      }
      detectedScroll = null;
      const offset   = Math.abs(type === 'horizontal' ? touchObj.pageX - initialX : touchObj.pageY - initialY);
      const hasSwipedOut = offset >= SwipeOutThresholdPixels;
      const hasSwipedAway = offset >= SwipeAwayThresholdPixels;
      if (type === 'horizontal') {
        /* UNCOMMENT IF THE VISIBILITY SHOULD BE HANDLED BY THE DIRECTIVE */ // , visibility ${swipeTime || '.5s'}
        el.style.transition = `all ${swipeTime || '.5s'}`;
        requestAnimationFrame(() => {
          if (swipeAway && hasSwipedAway) {
            el.style.transform = `translate3d(${touchObj.pageX - initialX > 0 ? '' : '-'}${SwipeAwayByPixels || '90%'}, 0, 0)`; // TODO: replace or with defaults
          }
          else if (swipeOut && hasSwipedOut) {
            el.style.transform = `translate3d(${touchObj.pageX - initialX > 0 ? '' : '-'}${SwipeOutByPixels || '90%'}, 0, 0)`; // TODO: replace or with default
            /* UNCOMMENT IF THE VISIBILITY SHOULD BE HANDLED BY THE DIRECTIVE */
            // el.style.visibility = 'hidden'
            swipedOut = true;
          }
          else {
            el.style.transform = '';
          }

          if (hasSwipedAway || hasSwipedOut) {
            const event = {direction: touchObj.pageX - initialX > 0 ? 'right' : 'left'};
            Emit(vnode, event, hasSwipedAway);
            Log(debug, 'END: emitting swipe');
          }

          setTimeout(() => {
            el.style.transition = '';
          }, 1000); // TODO: proper timing handling
        });
      }
      else if (type === 'vertical') {

        // CASE 1:
        /* UNCOMMENT IF THE VISIBILITY SHOULD BE HANDLED BY THE DIRECTIVE */ // , visibility ${swipeTime || '.5s'}
        requestAnimationFrame(() => {
          el.style.transition = `all ${swipeTime || '.5s'}`;
          if (swipeAway && hasSwipedAway) {
            el.style.transform = `translate3d(0, ${touchObj.pageY - initialY > 0 ? '' : '-'}${SwipeAwayByPixels || '90%'}, 0)`;
          }
          if (swipeOut && hasSwipedOut) {
            el.style.transform = `translate3d(0, ${touchObj.pageY - initialY > 0 ? '' : '-'}${SwipeOutByPixels || '90%'}, 0)`;
            /* UNCOMMENT IF THE VISIBILITY SHOULD BE HANDLED BY THE DIRECTIVE */
            // el.style.visibility = 'hidden'
            swipedOut = true;
          }
          else {
            Reset(el, backTime);
            swipedOut = false;
            Log(debug, 'END: resettings');
            el.style.transform = '';
          }

          if (hasSwipedAway || hasSwipedOut) {
            const event = {direction: touchObj.pageY - initialY > 0 ? 'top' : 'bottom'};
            Emit(vnode, event, hasSwipedAway);
            Log(debug, 'END: emitting swipe');
          }

          setTimeout(() => {
            el.style.transition = '';
          }, 1000); // TODO: Replace with proper timing handling
        });
      }
    }, false);
  },
};


/**
 * "Should skip" utility function (if the horizontal/vertical swipe is greater than the threshold
 * @param type type of swipe ('horizontal' or 'vertical')
 * @param pageY
 * @param initialY
 * @param pageX
 * @param initialX
 * @param threshold Minim amount of pixels of movement before a swipe is registered
 * @param debug
 * @returns {boolean} True if an actual swipe has not been registered
 */
function ShouldSkip(
    type: SwipeType,
    pageY: number,
    initialY: number,
    pageX: number,
    initialX: number,
    threshold: number,
    debug: boolean): boolean { // TODO: Fix madman indentation
  Log(debug, 'SKIP_CHECK -> ', {...arguments}); // TODO: remove useless debug line
  // if (type === 'horizontal' && Math.abs(pageY - initialY) >= Math.abs(pageX - initialX)) { return true }
  if (type === 'horizontal') {
    return Math.abs(pageX - initialX) < threshold;
  }
  else {
    return Math.abs(pageY - initialY) < threshold;
  }
}

/**
 * Get the amount of pixels of a given swipeOutBy value -> 5px becomes 5 while 50% in a 100px containers becomes 50
 * @param inputValue Accepted values are 1, 1% or 1px
 * @param element The dom element of the container
 * @param type Type of swipe ('horizontal' or 'vertical')
 * @returns {number} The actual number of pixels
 */
function GetActualPixels(inputValue: string, element: any, type: SwipeType): number {
  let actualValue: number;
  if (inputValue.includes != null) {
    if (inputValue.includes('%')) {
      if (type === 'horizontal') {
        actualValue = element.clientWidth * +inputValue.slice(0, -1) / 100; // TODO: check if float is needed
      }
      else {
        actualValue = element.clientHeight * +inputValue.slice(0, -1) / 100;
      }
    }
    else if (inputValue.includes('px')) {
      actualValue = +inputValue.slice(0, -2);
    }
    else {
      return +inputValue;
    }
  }
  else {
    return +inputValue;
  }

  return actualValue;
}

/**
 * Reset elements position because the user stopped swiping before the desired swipeOutThreshold or because it's not
 * swiping in the wanted direction
 * @param el Element
 * @param backTime Animation time for the transform 0
 */
function Reset(el: any, backTime: string): void {
  el.style.transition = `transform ${backTime || '.5s'}`;
  requestAnimationFrame(() => {
    el.style.transform = '';
    setTimeout(() => {
      el.style.transition = '';
    }, 500); // TODO: use backTime?
  });
}

/**
 * Just a dumb shorthand for Logs;
 * @param debug
 * @param args
 * @constructor
 */
function Log(debug: boolean, ...args: any[]): void {
  if (debug) {
    console.log(args);
  }
}

/**
 * Emits the event using the proper method falling back to the dom's default CustomEvent when a componentInstance
 * on the vnode is not available
 * @param vnode
 * @param event
 * @param hasSwipedAway
 * @constructor
 */

function Emit(vnode: any, event: any, hasSwipedAway: boolean = false): void {
  const eventName = hasSwipedAway ? 'swiped-away': 'swiped';
  vnode.context.$emit(eventName, event);
  if (vnode.componentInstance) {
    vnode.componentInstance.$emit(eventName, event); // use {detail:} to be uniform
  }
  else {
    vnode.elm.dispatchEvent(new CustomEvent(eventName, {detail: event}));
  }
}

function GetAllowedDirectionSign(direction: AllowedDirection): number {
  if (!direction) {
    return 0;
  }
  else if (direction === 'top' || direction === 'left') {
    return -1;
  }
  else {
    return 1;
  }
}

function HandleTransform(el: any, targetPosition: string, swipeTime: number = .5, resetTime: number, type: SwipeType) {
  el.style.transition = `all ${swipeTime}s`;
  if (type == 'horizontal') {
    el.style.transform = `translate3d(${targetPosition}, 0, 0)`;
  }
  else {
    el.style.transform = `translate3d(0, ${targetPosition}, 0)`;
  }
  setTimeout(() => {
    el.style.transition = '';
  }, resetTime);
}

export default Draggable;
