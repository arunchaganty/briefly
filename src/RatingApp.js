import React, { Component } from 'react';
import {Glyphicon, Panel, Well} from 'react-bootstrap';
import update from 'immutability-helper';
import Experiment from './Experiment.js'
import RatingWidget from './RatingEditWidget';
import levenshtein from 'fast-levenshtein';

import './RatingApp.css';

const BONUS_VALUE = '0.75';

class App extends Experiment {
  constructor(props) {
    super(props);
    this.handleValueChanged = this.handleValueChanged.bind(this);
  }

  title() {
    return (<p>Rate the short paragraph below</p>);
  }
  subtitle() {
    return null; //(<p><b>Correct grammatical errors, remove repeated text, etc.</b></p>);
  }

  instructionsVersion() {
    return '20180217';
  }

  instructions() {
    return (<InstructionContents
      bonus={BONUS_VALUE}
      isFirstTime={this.state.firstView}
      editable={!this.state.instructionsComplete}
      onValueChanged={(val) => this.setState({instructionsComplete: val})}
      />);
  }

  initState(props) {
    let state = super.initState(props);
    state = update(state, {
      output: {$merge: {
        response: RatingWidget.initialValue(props.contents.text),
        input: props.contents,
        }},
    });

    if (props._output) {
      state = update(state, {
        output: {$merge: props._output},
        canSubmit: {$set: this._canSubmit(props._output.response)},
      });
    }

    return state;
  }

  handleSubmit(evt) {
    if (this.state.canSubmit) {
      return true;
    } else {
      evt.preventDefault();
      return false;
    }
  }

  _canSubmit(response) {
    return RatingWidget.isComplete(response);
  }

  handleValueChanged(evt) {
    const valueChange = evt;
    this.setState(state => {
      state = update(state, {output: {response: RatingWidget.handleValueChanged(state.output.response, valueChange)}});
      const canSubmit = this._canSubmit(state.output.response);
      if (state.canSubmit !== canSubmit) {
        state = update(state, {canSubmit: {$set: canSubmit}});
      }
      return state;
    });
  }

  renderContents() {
    return (<Panel
              id="document"
              bsStyle="primary"
              >
      <Panel.Heading>
        <Panel.Title>Please read the paragraph below and rate it </Panel.Title>
      </Panel.Heading>
      <Panel.Body>
          <RatingWidget
            text={this.props.contents.text}
            value={this.state.output.response}
            onValueChanged={this.handleValueChanged}
            editable={true}
          />
      </Panel.Body>
        </Panel>);
  }

}

App.defaultProps = {
  contents: {id:"", text: "Some of them reported his arrest, or his house arrest, in the wake of an anti-corruption operation, which resulted, on the same day as the announcement of his resignation, by the arrest of dozens of princes and ministers of the Wahhabi kingdom."},
  estimatedTime: 300,
  reward: 1.25,
}

class Example extends Component {
  constructor(props) {
    super(props);

    if (this.props.editable) {
      this.state = RatingWidget.initialValue(this.props.text, this.props.questions);
      if (this.props.questions.includes("edit")) {
        Object.assign(this.state.selections.edit, this.props.expected.selections.edit);
      }
    } else {
      this.state = Object.assign({}, this.props.expected);
    }

    this.handleValueChanged = this.handleValueChanged.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (this.props !== nextProps) || (this.state !== nextState);
  }

  handleValueChanged(evt) {
    const valueChange = evt;
    if (this.props.editable || valueChange.moveTo !== undefined) {
      this.setState(state => update(state, RatingWidget.handleValueChanged(state, valueChange, this.props.questions)),
        () => {
          let status = this.checkAnswer()[0];
          let ret = (status === "correct") ? true : (status === "wrong") ? false : undefined;
          this.props.onChanged(ret);
        }
      );
    }
  }

  checkAnswer() {
    const self = this;

    let ret = ["correct", ""];
    for (let question of this.props.questions) {
      if (self.state.ratings[question] === undefined) {
        ret = ["incomplete", ""];
      } else if (question !== "edit" && self.state.ratings[question] !== self.props.expected.ratings[question]) {
        return ["wrong", ""];
      } else if (question === "edit" && self.props.expected.editOptions[question].every(e => e !== self.state.edits[question])) {
        let dists = self.props.expected.editOptions[question].map(e => levenshtein.get(e, self.state.edits[question]));
        let minDist = Math.min.apply(null, dists);
        let maxDist = Math.max.apply(null, dists);
        let distMsg;
        if (minDist === maxDist) {
          distMsg = "just " +  maxDist;
        } else {
          distMsg = "between " + minDist + " and " + maxDist;
        }
        let msg = "There's a correct answer that needs you to edit " + distMsg + " characters.";

        return ["more-edits", msg];
      } else if (RatingWidget.getStatus(self.state, question) === "incomplete") {
        ret = ["incomplete", ""];
      }
    }
    return ret;
  }

  renderWell(status, msg) {
    const bsStyle = (status === "incomplete") ? "primary" : (status === "correct") ? "success" : "danger";
    const well = 
      (status === "correct") ? (<span><b>That's right!</b> {this.props.successPrompt}</span>)
      : (status === "wrong") ? (<span><b>Hmm... that doesn't seem quite right yet.</b> {this.props.wrongPrompt}</span>)
      : (status === "more-edits") ? (<span><b>You're getting there!</b> {msg}</span>)
      : (status === "poor-highlight") ? (<span><b>Hmm... the highlighted region could be improved.</b></span>)
      : undefined;

    return well && (<Well bsStyle={bsStyle}>{well}</Well>);
  }

  render() {
    const [status, msg] = this.checkAnswer();
    const bsStyle = (status === "incomplete") ? "primary" : (status === "correct") ? "success" : "danger";

    return (
      <Panel bsStyle={bsStyle}>
      <Panel.Heading><Panel.Title>{this.props.title}</Panel.Title></Panel.Heading>
      <Panel.Body>
        <p>{this.props.leadUp}</p>
          <RatingWidget
            text={this.props.text}
            value={this.state}
            questions={this.props.questions}
            onValueChanged={this.handleValueChanged}
            editable={this.props.editable}
          />
        {this.renderWell(status, msg)}
      </Panel.Body>
      </Panel>
    );
  }
}

Example.defaultProps = {
  id: "#example",
  title: "#. Description of example.",
  text: "This is a great sentence.",
  questions: Object.keys(RatingWidget.QUESTIONS),
  expected: undefined,
  editable: true,
  onChanged: () => {},
  successPrompt: "",
  wrongPrompt: "",
}

class InstructionsBlock extends Component {
  renderDefinitions() {
    let defns = [];
    for (let option of this.props.options) {
      defns.push(<dt key={"dt-"+option.value}>Rate it <Glyphicon glyph={option.glyph}/> if: </dt>);
      defns.push(<dd key={"dd-"+option.value}>{option.tooltip}</dd>);
    }
    return <dl className="dl-horizontal">{defns}</dl>;
  }

  renderHighlightNote() {
    let highlightOptions = this.props.options.filter(o => o.needsHighlight).map(o => <Glyphicon key={o.value} glyph={o.glyph} />);
    if (highlightOptions.length === 1) {
      return <p>If you have rated the text {highlightOptions[0]}, then you will also need to {this.props.highlightPrompt}.</p>
    } else if (highlightOptions.length > 1) {
      // intersperse with text.
      let nOptions = highlightOptions.length;
      for (let i = nOptions-1; i > 0; i--) {
        highlightOptions.splice(i, 0, " or ");
      }
      return <p>If you have rated the paragraph as one of {highlightOptions}, then you will also need to <u>{this.props.highlightPrompt}</u>.</p>
    }
  }

  render() {
    return (<div>
      {this.props.definition}
      {this.renderDefinitions()}
      
      {this.renderHighlightNote()}

      {this.props.examples.map(ex => (
              <Example
                key={ex.text}
                onChanged={(evt) => this.props.onChanged([ex.id, evt])}
                editable={this.props.editable}
                {...ex}
              />))}

    </div>);
  }
}
InstructionsBlock.defaultProps = {
  prompt: "This is a question?",
  definition: "The question is defined here.",
  examples: [],
  editable: true,
  onChanged: () => {},
};

class InstructionContents extends Component {
  constructor(props) {
    super(props);

    this.state = this.initState(props);
    this.handleValueChanged = this.handleValueChanged.bind(this);
  }

  INSTRUCTION_KEY = {
    "grammar-e1": true,
    "grammar-e2": true,
    "grammar-e3": true,

    "redundancy-e1": true,
    "redundancy-e2": true,
    "redundancy-e3": true,

    "overall-e1": true,
    "overall-e2": true,

    "edit-e1": true,
    "edit-e2": true,
    "edit-e3": true,
  };

  initState(props) {
    if (props.isFirstTime) {
      return {};
    } else  {
      return this.INSTRUCTION_KEY;
    }
  }

  handleValueChanged(evt) {
    let [key, val] = evt;
    let update_ = {};
    update_[key] = val;
    this.setState(update_, () => Object.keys(this.INSTRUCTION_KEY).every(k => this.state[k]) && this.props.onValueChanged(true));
  }

  render() {
    let lede = (this.props.isFirstTime)
        ?  (<p>
          <b>Before you proceed with the HIT, you must complete the tutorial below</b> (you only need to do this once per session though!).
          The tutorial should take about <i>5 minutes to complete</i> and you will get <b>a (one-time) ${this.props.bonus} bonus</b> for completing it.
          </p>)
        : undefined;

    return (<div>
      {lede}
      <p className="lead">
      Imagine that you are a grade-school English
      teacher reading a short paragraph written by your students that summarizes a news article: <u>we'd like
      you to grade the summary as given and then edit it to show how it can be made better.</u>
      </p>

      <p>
      In this instruction/tutorial, we will explain each of these parts with a brief quiz at
      the end of each section. <b>You must correctly answer each quiz
      question to proceed.</b>
      </p>

      <h3>How to use the interface</h3>
      <ul>
        <li>For each question described below, you will need to <b>rate it on a scale of good (<Glyphicon glyph="ok"/>) to bad (<Glyphicon glyph="remove"/>)</b>.</li>
        <li>Finally, after the questions, you will need to <b>improve the paragraph by clicking on it</b>.</li>
        <li>Sometimes the words written by the student are&nbsp;
          <b>undecipherable and are displayed as ▃ </b>. Here, <b>try to be generous</b>&nbsp;
        to the student and imagine what the word is likely to have been.
        For example, in <i>"Leighton ▃ is the first female jockey in the history of Polo."</i>, the ▃  is probably the person's last name.</li>
        <li>Finally, the <b>capitalization of some of these sentences may be correct</b>:
      for example, in <i>"from a man purporting to be Robert&nbsp;
      <u>durst</u>"</i>, <i>"durst"</i> should be capitalized. <b>Please be
      lenient and only mark such examples if you genuinely can't
      understand what was written.</b></li>
      </ul>

      <h3>Question definitions (and quiz!)</h3>

      {Object.keys(RatingWidget.QUESTIONS).map((q,i) => (
        <Panel key={q} defaultExpanded={true} eventKey={q}>
        <Panel.Heading>
          <Panel.Title toggle>
              <b>Q{i+1}. {RatingWidget.QUESTIONS[q].prompt}</b>
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
        <Panel.Body>
          <InstructionsBlock
            editable={this.props.editable}
            onChanged={this.handleValueChanged}
            {...RatingWidget.QUESTIONS[q]} />
        </Panel.Body>
        </Panel.Collapse>
        </Panel>))}

      </div>);
  }
}
InstructionContents.defaultProps = {
  bonus: 0.50,
  isFirstTime: false,
  editable: false,
  onValueChanged: () => {},
}

export default App;
