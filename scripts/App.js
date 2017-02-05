import React, { Component, PropTypes, Children } from 'react';
import { VelocityTransitionGroup } from 'velocity-react';

/**
 * The default panel animation for 'enter'.
 * @type {Object}
 */
const DEFAULT_ENTER_ANIMATION = {
    animation: { opacity: [ 1, 0 ], translateX: [ 0, 40 ], translateZ: 0 },
    duration: 200,
    style: {
        opacity: 1,
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        zIndex: '',
    },
};

/**
 * The default panel animation for leaving.
 * @type {Object}
 */
const DEFAULT_LEAVE_ANIMATION = {
    animation: { opacity: [ 0, 1 ], translateX: -40, translateZ: 0 },
    duration: 200,
    style: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        zIndex: 1,
    },
};

export class Modal extends Component {

  static propTypes = {
    isOpen: PropTypes.bool,
  };

  static defaultProps = {
    isOpen: false
  };

  render() {
    const { className = '', isOpen } = this.props;
    const classes = [ 'modal', className ];

    if (isOpen) classes.push('modal--open');

    return (
      <VelocityTransitionGroup
        runOnMount
        enter={ { animation: 'fadeIn', duration: 100 } }
        leave={ { animation: 'fadeOut', duration: 100 } }>
        { isOpen ? <aside className={ classes.join(' ') }>
          { this.props.children }
        </aside> : undefined }
      </VelocityTransitionGroup>
    );
  }
}

const MultiPartModalPanel = (WrappedComponent) => {
  return class extends Component {

    static defaultProps = {
        advanceText: 'Continue',
        enter: DEFAULT_ENTER_ANIMATION,
        leave: DEFAULT_LEAVE_ANIMATION,
        isVisible: false,
        onEnter: null,
        onLeave: null,
    };

    static propTypes = {
      enter: PropTypes.object,
      leave: PropTypes.object,
      isVisible: PropTypes.bool,
      advanceText: PropTypes.string,
      onEnter: PropTypes.func,
      onLeave: PropTypes.func,
    };

    render() {
      const { enter, leave, isVisible, children } = this.props;
      const props = omit(this.props,
          'enter', 'leave', 'isVisible', 'advanceText');

      return (
        <VelocityTransitionGroup
          runOnMount
          enter={ enter }
          leave={ leave }>
            { isVisible ? <div className="modal__panel">
              <WrappedComponent { ...props } />
            </div> : undefined }
        </VelocityTransitionGroup>
      );
    }
  }
};

export class MultiPartModal extends Component {

  static defaultProps = {
    initialPanel: 0,
    isOpen: false,
    onDismiss: null,
    onComplete: null,
    dismissText: 'Dismiss',
    onOpen: null,
    onClose: null
  };

  static propTypes = {
    initialPanel: PropTypes.any.isRequired,
    isOpen: PropTypes.bool,
    onDismiss: PropTypes.func,
    onComplete: PropTypes.func,
    dismissText: PropTypes.string,
    onOpen: PropTypes.func,
    onClose: PropTypes.func,
  };

  constructor(props) {
    super(props);

    this.setInitialPanelState();
  }

  setInitialPanelState() {
    const { initialPanel } = this.props;
    const { props: { advanceText } } = this.accessPanel(initialPanel);
    const state = {
      currentPanel: initialPanel,
      advanceText,
      hasCompleted: false
    };

    if (!this.state) {
      this.state = state;
      return;
    }

    this.setState(state);
  }

  componentDidMount() {
    const { onOpen, isOpen } = this.props;

    if (!isOpen) return;

    if (onOpen) onOpen();

    this.enterPanel();
  }

  enterPanel() {
    const { currentPanel } = this.state;
    const { props: { onEnter } } = this.accessPanel(currentPanel);

    if (onEnter) onEnter();
  }

  componentWillReceiveProps(nextProps) {
    const { isOpen: currentlyOpen } = this.props;
    const { isOpen: goingToBeOpen, onOpen, onClose } = nextProps;

    if (currentlyOpen !== goingToBeOpen) {
      // The modal is opening or closing.
      if (goingToBeOpen) {
        if (onOpen) onOpen();

        this.setInitialPanelState();
      } else if (onClose) {
        // If it isn't about to be open, run `onClose` prop if provided.
        onClose();
      }
    }
  }

  componentDidUpdate({ isOpen: wasOpen }, { currentPanel: previousPanel }) {
    const { isOpen } = this.props;
    const { currentPanel } = this.state;

    // Run the onEnter callback when there is an update. Should be run if there
    // is a new currentPanel or if it wasn't open and now isOpen (the modal
    // is starting from the default state).
    if ((currentPanel !== previousPanel) || (!wasOpen && isOpen)) {
      this.enterPanel();
    }
  }

  accessPanel(key) {
    return Children.toArray(this.props.children)
      .find(({ props: { panelIndex } }) => panelIndex === key);
  }

  advance() {
    const { currentPanel, hasCompleted } = this.state;
    let { props: { canAdvance, nextPanel, onLeave } } =
      this.accessPanel(currentPanel);

    if (!canAdvance || hasCompleted) return;

    if (onLeave) onLeave();

    if (!nextPanel) return this.complete();

    const { props: { advanceText } } = this.accessPanel(nextPanel);

    this.setState({
      currentPanel: nextPanel,
      advanceText
    });
  }

  complete() {
    const { onComplete } = this.props;

    this.setState({ hasCompleted: true });

    if (onComplete) onComplete();
  }

  dismiss(e) {
    const { onDismiss } = this.props;

    if (onDismiss) onDismiss();
  }


  renderChildren() {
    const { children, initialPanel } = this.props;
    const { currentPanel } = this.state;
    return Children.map(children, child => {
      const { props: { panelIndex, enter, leave, nextPanel } } = child;
      // Apply visibility prop to children. The initialPanel shouldn't
      // transition on when entering. Also, if there isn't a `nextPanel`
      // specified, assume this is the last panel before completing, so don't
      // use a leave animation.
      return React.cloneElement(child, {
        isVisible: panelIndex === currentPanel,
        enter: panelIndex === initialPanel ? {} : enter,
        leave: !nextPanel ? {} : leave,
      });
    });
  }

  renderNav() {
    const { dismissText } = this.props;
    const { advanceText } = this.state;

    return (
      <nav className="modal__nav">
        <ul>
          <li>
            <button onClick={ (e) => this.dismiss(e) }>
              { dismissText }
            </button>
          </li>
          <li>
            <button onClick={ (e) => this.advance(e) }>
              { advanceText }
            </button>
          </li>
        </ul>
      </nav>
    );
  }

  render() {
    const { isOpen, children } = this.props;

    return (
      <Modal isOpen={ isOpen } className="modal--multi-part modal-multi-part">
        <div className="modal-multi-part__panels">
          { this.renderChildren() }
        </div>
        { this.renderNav() }
      </Modal>
    );
  }
}

class Panel extends Component {
  static propTypes = {
    onClick: PropTypes.func,
    panelIndex: PropTypes.any.isRequired,
  };

  render() {
    const { onClick, panelIndex } = this.props;

    return (
      <div>
        <h2>Panel With key: { panelIndex }</h2>
        <button onClick={ () => onClick() }>
          Validate Panel { panelIndex }
        </button>
      </div>
    );
  }
}


const DecoratedPanel = MultiPartModalPanel(Panel);

export default class App extends Component {

  state = {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    isModalOpen: false
  };

  validate(key) {
    return !!this.state[key];
  }

  reset() {
    this.setState({
      isModalOpen: !this.state.isModalOpen,
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
    });
  }

  render() {
    const { isModalOpen } =  this.state;

    return (
      <div>
        <MultiPartModal
          onClose={ () => console.log('closed') }
          onOpen={ () => console.log('open') }
          onDismiss={ () => this.reset() }
          onComplete={ () => console.log('completed') }
          initialPanel={ 1 }
          isOpen={ isModalOpen }>

          { range(1, 6, (index) => {
            return (
              <DecoratedPanel
                key={ index }
                panelIndex={ index }
                nextPanel={ index === 6 ? null : index + 1 }
                onClick={ () => this.setState({ [index]: true }) }
                canAdvance={ this.validate(index) }
                onLeave={ () => console.log(`leaving panel ${index}`) }
                onEnter={ () => console.log(`entering panel ${index}`) }
                advanceText={ index === 6 ? 'Save Now!' : 'Continue' } />
            );
          }) }

        </MultiPartModal>

        <button onClick={ () => this.reset() }>
          { isModalOpen ? 'Close' : 'Open' } Modal
        </button>
      </div>
    );
  }
}


function range(from = 0, to, callback) {
  const accumulator = [];
  for (; from <= to; from++) {
    accumulator.push(callback(from));
  }
  return accumulator;
}

function omit(object, ...keys){
  const omitted = { ...object };
  keys.forEach(key => delete omitted[key]);
  return omitted;
}
