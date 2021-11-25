const { expect } = require('@playwright/test');
const Page = require('../core/page');
const e = require('../core/elements');
const util = require('./util.js');
const utilPresentation = require('../presentation/util');
const { ELEMENT_WAIT_LONGER_TIME } = require('../core/constants');
const { checkElement } = require('../core/util.js');

class Polling {
  constructor(browser, context) {
    this.browser = browser;
    this.context = context;
    this.newInputText = 'new option';
  }

  async initPages(page1) {
    await this.initModPage(page1);
    const page2 = await this.context.newPage();
    await this.initUserPage(page2);
  }

  async initModPage(page) {
    this.modPage = new Page(this.browser, page);
    await this.modPage.init(true, true, { fullName: 'Moderator' });
  }

  async initUserPage(page) {
    this.userPage = new Page(this.browser, page);
    await this.userPage.init(false, true, { fullName: 'Attendee', meetingId: this.modPage.meetingId });
  }

  async createPoll() {
    await this.modPage.waitForSelector(e.whiteboard, ELEMENT_WAIT_LONGER_TIME);
    await util.startPoll(this.modPage);
    await this.modPage.hasElement(e.pollMenuButton);
  }

  async pollAnonymous() {
    await this.modPage.waitForSelector(e.whiteboard, ELEMENT_WAIT_LONGER_TIME);
    await util.startPoll(this.modPage, false, true);
    await this.modPage.waitForSelector(e.publishPollingLabel);
    await this.userPage.waitAndClick(e.pollAnswerOptionBtn);
    const resp = !await this.modPage.page.evaluate(checkElement, e.receivedAnswer);

    await expect(resp).toBeTruthy();
  }

  async quickPoll() {
    await this.modPage.waitForSelector(e.whiteboard, ELEMENT_WAIT_LONGER_TIME);
    await utilPresentation.uploadPresentation(this.modPage, e.questionSlideFileName);

    await this.modPage.waitAndClick(e.quickPoll);
    await this.modPage.waitForSelector(e.pollMenuButton);

    await this.userPage.hasElement(e.pollingContainer);
  }

  async pollUserResponse() {
    await this.modPage.waitForSelector(e.whiteboard);
    await util.openPoll(this.modPage);

    await this.modPage.type(e.pollQuestionArea, e.pollQuestion);
    await this.modPage.waitAndClick(e.userResponseBtn);
    await this.modPage.waitAndClick(e.startPoll);

    await this.userPage.waitForSelector(e.pollingContainer);
    await this.userPage.type(e.pollAnswerOptionInput, e.answerMessage);
    await this.userPage.waitAndClick(e.pollSubmitAnswer);

    await this.modPage.hasText(e.receivedAnswer, e.answerMessage);

    await this.modPage.waitAndClick(e.publishPollingLabel);
    await this.modPage.waitForSelector(e.restartPoll);

    await this.modPage.hasElement(e.pollResults);
  }

  async stopPoll() {
    await this.modPage.waitForSelector(e.whiteboard, ELEMENT_WAIT_LONGER_TIME);
    await util.startPoll(this.modPage);
    await this.userPage.waitForSelector(e.pollingContainer);
    await this.modPage.waitAndClick(e.cancelPollBtn);
    await this.userPage.wasRemoved(e.pollingContainer);
  }

  async pollResultsOnChat() {
    await this.modPage.waitForSelector(e.whiteboard, ELEMENT_WAIT_LONGER_TIME);
    await util.startPoll(this.modPage, true);
    await this.modPage.waitAndClick(e.chatButton);

    await this.modPage.hasElement(e.chatPollMessageText);
    await this.userPage.hasElement(e.chatPollMessageText);
  }

  async pollResultsOnWhiteboard() {
    await this.modPage.waitForSelector(e.whiteboard, ELEMENT_WAIT_LONGER_TIME);
    await util.startPoll(this.modPage, true);
    await this.modPage.hasElement(e.pollResults);
  }

  async pollResultsInDifferentPresentation() {
    await this.modPage.waitForSelector(e.whiteboard, ELEMENT_WAIT_LONGER_TIME);
    await util.startPoll(this.modPage);

    await utilPresentation.uploadPresentation(this.modPage, e.questionSlideFileName);
    await this.modPage.waitAndClick(e.publishPollingLabel);

    // Check poll results
    await this.modPage.hasElement(e.pollResults);
  }

  async manageResponseChoices() {
    await this.modPage.waitForSelector(e.whiteboard, ELEMENT_WAIT_LONGER_TIME);
    await this.startNewPoll();
    const initialRespCount = await this.modPage.getSelectorCount(e.pollOptionItem);

    // Add
    await this.modPage.waitAndClick(e.addPollItem);
    await this.typeOnLastChoiceInput();
    await this.modPage.waitAndClick(e.startPoll);

    await expect(initialRespCount + 1).toEqual(await this.getAnswerOptionCount());
    await this.checkLastOptionText();

    // Delete
    await this.startNewPoll();
    await this.modPage.waitAndClick(e.deletePollOption);
    await this.modPage.waitAndClick(e.startPoll);

    await expect(initialRespCount - 1).toEqual(await this.getAnswerOptionCount());

    // Edit
    await this.startNewPoll();
    await this.typeOnLastChoiceInput();
    await this.modPage.waitAndClick(e.startPoll);

    await expect(initialRespCount).toEqual(await this.getAnswerOptionCount());
    await this.checkLastOptionText();
  }

  async startNewPoll() {
    const hasPollStarted = await this.modPage.page.evaluate(checkElement, e.pollMenuButton);
    if (hasPollStarted) {
      await this.modPage.waitAndClick(e.cancelPollBtn);
      await this.userPage.wasRemoved(e.pollingContainer);
    }
    await util.openPoll(this.modPage);
  }

  async getAnswerOptionCount() {
    await this.userPage.waitForSelector(e.pollingContainer);
    return this.userPage.getSelectorCount(e.pollAnswerOptionBtn);
  }

  async typeOnLastChoiceInput() {
    const allInputs = await this.modPage.getLocator(e.pollOptionItem);
    const lastInput = allInputs.last();
    await lastInput.fill(this.newInputText);

  }

  async checkLastOptionText() {
    await this.userPage.waitForSelector(e.pollingContainer);
    const answerOptions = await this.userPage.getLocator(e.pollAnswerOptionBtn);
    const lastOptionText = await answerOptions.last().textContent();
    await expect(lastOptionText).toEqual(this.newInputText);
  }
}

exports.Polling = Polling;