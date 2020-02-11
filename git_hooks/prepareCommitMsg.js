#!/usr/bin/env node

const fs = require('fs');
const colors = require('colors');

const getJiraLink = taskName => `[${taskName}](https://example.ru/browse/${taskName})`;

const TAG_TYPE = '(Fix|New|Upgrade|Chore)';
const WIP_TAG = '(WIP)';
const JIRA_TASK = 'TASK-\\d{4}';
const MASTER_BRANCH = 'master';

// Регулярки под разные типы коммитов
const BRANCH_REGEXP = new RegExp(`${TAG_TYPE}: (${JIRA_TASK}) (.*)\\s`);
const MASTER_REGEXP = new RegExp(`${TAG_TYPE}: (${MASTER_BRANCH}) (.*)\\s`);
const WIP_REGEXP = new RegExp(`${WIP_TAG}: (${MASTER_BRANCH}|${JIRA_TASK}) (.*)\\s`);

const [, commitType] = process.env.HUSKY_GIT_PARAMS.split(' ');
const isMergeBranch = commitType === 'merge';

const messageFile = '.git/COMMIT_EDITMSG';

// Получение commit-message
const gitMessage = fs.readFileSync(messageFile, { encoding: 'utf-8' });

// Сматчиваем все регулярки
const branchMatch = gitMessage.match(BRANCH_REGEXP);
const masterMatch = gitMessage.match(MASTER_REGEXP);
const wipMatch = gitMessage.match(WIP_REGEXP);

// Исключение мерж-коммитов
if (!isMergeBranch) {
  // Если сматчился коммит в ветке задачи
  if (branchMatch) {
    const [,tag, taskName, message] = branchMatch;
    const commitMessage = `${tag}: ${getJiraLink(taskName)} - ${process.env.USER} - ${message}`;

    fs.writeFileSync(messageFile, commitMessage);
    console.log(colors.green.bold(`${gitMessage}    you Maestro!`));

  // Если сматчился коммит в ветке master
  } else if (masterMatch) {
    const [,tag, taskName, message] = masterMatch;
    const commitMessage = `${tag}: master HOTFIX - ${process.env.USER} - ${message}`;

    fs.writeFileSync(messageFile, commitMessage);
    console.log(colors.green.bold(`${gitMessage}    you Maestro!`));

  // Если сматчился коммит для разработки
  } else if (wipMatch) {
    const [,tag, taskName, message] = wipMatch;
    const commitMessage = `${tag}: ${taskName} - ${process.env.USER} - ${message}`;

    fs.writeFileSync(messageFile, commitMessage);
    console.log(colors.yellow.bold('Коммиты типа WIP нужны для разработки. Не забудьте их склеить в итоговый коммит!'));

  // Обработка ошибок именования
  } else {
    console.log(colors.red.bold(gitMessage), colors.red(
      'Ты пойман за руку! Сообщение не корректно. Правильное ведение коммитов позволяет вести чистый Changelog и быстрее находить баги.'
    ));
    console.log(colors.yellow.bold(
      'Правильные варианты сообщений:'
    ));
    console.log(colors.yellow(
      '1. {Тип изменений}: TASK-{номер тикета} {информация о содержании коммита}'
    ));
    console.log(colors.yellow.bold('Пример:'), colors.yellow(
      'Fix: TASK-0000 commit message'
    ));
    console.log(colors.yellow(
      '2. WIP: {master или TASK-номер} {информация о содержании коммита}'
    ));
    console.log(colors.yellow.bold('Пример:'), colors.yellow(
      'WIP: TASK-0000 commit message'
    ));
    console.log(colors.yellow(
      '3. {Тип изменений}: master {информация о содержании коммита}'
    ));
    console.log(colors.yellow.bold('Пример:'), colors.yellow(
      'Fix: master commit message'
    ));

    process.exit(1);
  }
}
