import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baselinePaths = ['docs/audit/course-builder-learning-draft.json', 'docs/audit/course53-56-learning-draft.json'];
const driveManifestPath = 'docs/audit/drive-source-manifest.json';
const reportPath = 'C:/Users/ACER/.codex/visualizations/2026/10/03/01a102c6-28e9-7d12-ab7a-d8b58f36616a/pedagogical-review/hallazgos-56-unidades.json';
const patchPath = 'docs/audit/pedagogy/patch-38-56.json';
const units = Array.from({ length: 19 }, (_, index) => index + 38);
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const baselines = baselinePaths.flatMap((file) => readJson(path.join(root, file)).plans);
const drive = readJson(path.join(root, driveManifestPath));
const lessonToUnit = new Map(Object.values(drive.units).filter((entry) => entry?.published?.lesson?.id).map((entry) => [entry.published.lesson.id, entry.unit]));
const plansByUnit = new Map();
for (const plan of baselines) {
  const unit = lessonToUnit.get(plan.lessonId);
  if (unit !== undefined) plansByUnit.set(unit, plan);
}
for (const unit of units) if (!plansByUnit.has(unit)) throw new Error(`Missing lesson plan for Unit ${unit}`);

const missing = () => ({ $missing: true });
const deleted = () => ({ $delete: true });
const clone = (value) => JSON.parse(JSON.stringify(value));
const getAt = (value, pathParts) => pathParts.reduce((current, key) => current?.[key], value);
const patches = [];

function rowFor(unit, rowMatcher) {
  const row = plansByUnit.get(unit).nextRows.find(rowMatcher);
  if (!row) throw new Error(`Could not resolve row for Unit ${unit}`);
  return row;
}
function patchFor(unit, row, reason) {
  const existing = patches.find((entry) => entry.unit === unit && entry.rowId === row.id);
  if (existing) { existing.reason = `${existing.reason} ${reason}`; return existing; }
  const entry = { unit, lessonId: row.lessonId, rowId: row.id, reason, changes: [] };
  patches.push(entry);
  return entry;
}
function change(unit, row, reason, pathParts, after) {
  const beforeValue = getAt(row.data, pathParts);
  if (beforeValue !== undefined && JSON.stringify(beforeValue) === JSON.stringify(after)) return;
  patchFor(unit, row, reason).changes.push({ path: pathParts, before: beforeValue === undefined ? missing() : clone(beforeValue), after: clone(after) });
}
const replace = (unit, row, reason, pathParts, after) => change(unit, row, reason, pathParts, after);
const remove = (unit, row, reason, pathParts) => change(unit, row, reason, pathParts, deleted());

const turnSpecs = {
  38: [['topic', 'Name two chores or tasks people often ask others to do. Use have or get + object + verb.', 'Give two short examples.'], ['example', 'Describe one situation in which you ask someone to help at home or work.', 'Say who does what and use one causative structure.'], ['frequency', 'How often do you ask for help, and what makes the request useful or necessary?', 'Explain briefly.']],
  39: [['situation', 'Describe a recent situation in which communication or teamwork had to work out.', 'Give the context in one or two sentences.'], ['phrasal-verb', 'Choose one phrasal verb from the lesson that fits your situation.', 'Use it in a complete sentence.'], ['meaning', 'Explain what your phrasal verb means in that context.', 'Paraphrase its meaning.']],
  40: [['appreciation', 'Name one simple action or thing that makes you feel grateful.', 'Give one example.'], ['collocation', 'Use a delexical verb such as do, make, take, give, or have with a suitable noun.', 'Say the full collocation.'], ['meaning', 'Explain what your collocation means in context.', 'Use a short paraphrase.']],
  41: [['anecdote', 'Describe a day that changed unexpectedly.', 'Set the scene briefly.'], ['sequence', 'Mention one event that had happened before the change.', 'Use the past perfect.'], ['reflection', 'Explain how the earlier event affected what happened next.', 'Connect the two events.']],
  42: [['statement', 'State one short, neutral sentence that a speaker could have said.', 'Give the direct statement.'], ['report', 'Report that statement using said or asked and include that when it fits.', 'Give the reported version.'], ['shift', 'Explain one pronoun or time change you made when reporting it.', 'Name the change briefly.']],
  43: [['tag', 'State an opinion about an everyday topic and add a matching tag question.', 'Say the statement and tag.'], ['modal', 'Make a second example with a modal or an imperative and its tag.', 'Use one complete sentence.'], ['function', 'Explain whether your tag checks information, shows interest, or expresses surprise.', 'Choose one function.']],
  44: [['issue', 'Name a public issue without assigning blame unless your source provides evidence.', 'Introduce the issue neutrally.'], ['passive', 'Describe what was done or affected using a passive construction.', 'Use one passive sentence.'], ['agent', 'Add a by-phrase only if the responsible agent is known from your source.', 'Explain your choice.']],
  45: [['counterfactual', 'Choose a clearly fictional past event that could have had a different outcome.', 'Name the event.'], ['third-conditional', 'Describe the alternative outcome with if + past perfect and would have + past participle.', 'Say one complete sentence.'], ['comparison', 'Explain how the imagined outcome differs from what happened.', 'Compare the two outcomes.']],
  46: [['decision', 'Describe one past decision and what should have happened instead.', 'Use should have + past participle.'], ['modal-perfect', 'Use would have or must have to describe an imagined or inferred past result.', 'Give one example.'], ['evidence', 'Explain whether your sentence expresses advice, imagination, or deduction.', 'Name the function.']],
  47: [['regret', 'Describe a regret, or choose a clearly fictional one if you prefer.', 'Give the situation briefly.'], ['wish', 'Use if only or wish with the past perfect to express the regret.', 'Say one complete sentence.'], ['lesson', 'Explain what might be different now in the imagined scenario.', 'Add one consequence.']],
  48: [['possibility', 'Describe one possible past event without claiming that it definitely happened.', 'Keep the wording cautious.'], ['modal-perfect', 'Use could have, may have, or might have to express the possibility.', 'Give one sentence.'], ['certainty', 'Explain why your sentence expresses possibility rather than certainty.', 'Refer to the modal.']],
  49: [['precaution', 'Name a situation where preparation could help prevent a problem.', 'Give one everyday example.'], ['in-case', 'Use in case to describe the precaution.', 'Say one complete sentence.'], ['contrast', 'Contrast your sentence with an if-clause that describes a condition.', 'Explain the difference.']],
  50: [['wish', 'Name a future wish or an unlikely situation.', 'Give one example.'], ['hypothesis', 'Use would, could, or wish to describe the imagined result.', 'Say one complete sentence.'], ['reason', 'Explain why the situation is unlikely or why you want the change.', 'Add one reason.']],
  51: [['scenario', 'Choose a global disaster that was predicted but did not happen. What might have happened if it had become reality? Where might that have led us?', 'Name the event.'], ['mixed-result', 'Use a mixed or third conditional to describe the present result.', 'Give one complete sentence.'], ['outcome', 'Explain how the imagined present differs from reality.', 'Compare the outcomes.']],
  52: [['milestone', 'Choose one future milestone and say what will have been completed by then.', 'Use will have + past participle.'], ['duration', 'Contrast that completed event with an action that will have been in progress.', 'Use will have been + -ing.'], ['projection', 'Use the valid model question “Where will we have gotten as a society in 40 years?” to discuss a future projection.', 'Give one reason for your projection.']],
  53: [['historical-scenario', 'Choose a historical counterfactual and label the imagined details as fictional.', 'Name the scenario precisely.'], ['mixed-conditional', 'Use if + past perfect with would + base verb to connect a past condition to a present result.', 'Give one sentence.'], ['evidence', 'Separate historical evidence from your imagined consequences.', 'Identify which details are factual.']],
  54: [['present-condition', 'Choose a present trait or condition that could have changed a past result.', 'Name the condition.'], ['mixed-conditional', 'Use if + past simple or were with would have + past participle.', 'Give one complete sentence.'], ['past-result', 'Explain the past result of the imagined present condition.', 'Connect the two parts.']],
  55: [['social-issue', 'Choose a social movement or public issue and describe two perspectives on it.', 'Keep the language respectful.'], ['future-past', 'Use if + were going to + verb with would have + past participle to discuss a possible past result.', 'Give one sentence.'], ['position', 'State your position and support it with one reason.', 'Explain briefly.']],
  56: [['topic', 'Choose a simple or complex topic for a short presentation.', 'Name the topic.'], ['nominalization', 'Use a gerund or infinitive clause as the subject of one sentence.', 'Give one sentence.'], ['relative-clause', 'Add a relative clause to explain one part of your topic.', 'Give one sentence.']],
};
const turnModels = {
  38: 'I have my assistant print the report.',
  39: 'We need to work out a solution.',
  40: 'I take a break when I feel tired.',
  41: 'By the time I arrived, the meeting had started.',
  42: 'Direct statement: “I am ready.”',
  43: 'It is useful, isn’t it?',
  44: 'The report was prepared by the team.',
  45: 'If I had checked the map, I would have arrived earlier.',
  46: 'She should have called earlier.',
  47: 'I wish I had asked sooner.',
  48: 'They might have missed the train.',
  49: 'Take notes in case you need them; if you need help, ask.',
  50: 'I wish the situation were different.',
  51: 'If I had chosen that path, I would be in a different role now.',
  52: 'By 2035, we will have completed the project.',
  53: 'If the event had not occurred, the present might be different.',
  54: 'If she were more prepared, she would have avoided the delay.',
  55: 'If people were going to accept it fully, wouldn’t they have acted already?',
  56: 'To improve the process takes patience.',
};
const turnsFor = (unit) => turnSpecs[unit].map(([id, question, answerPrompt], index) => ({
  id,
  question,
  answerPrompt: index === 0 ? `Por tu cuenta, interpreta ambos papeles; con tu profesora, alternen. Modelo: ${turnModels[unit]}` : answerPrompt,
}));
const finalEssayCriteria = {
  38: 'Evaluate 120–160 words for clear organization, accurate have/get causatives, and a specific workplace example. Accept a personal or clearly labeled fictional example.',
  39: 'Evaluate 120–160 words for a clear workplace focus, accurate phrasal verbs in context, and understandable support. Accept equivalent phrasal verbs when meaning is preserved.',
  40: 'Evaluate 120–150 words for clear organization, accurate delexical verb collocations, and relevant examples. Do not require personal disclosure.',
  41: 'Evaluate 120–160 words for a clear sequence of events and accurate past perfect forms. Accept a clearly labeled fictional anecdote.',
  42: 'Evaluate 120–160 words for a coherent news-style report, accurate reported speech, and clear attribution. Do not invent speaker identities or require factual local events.',
  43: 'Evaluate 120–160 words for a clear comparison, accurate tag questions, and supported ideas. Accept a clearly labeled fictional or general example.',
  44: 'Evaluate 120–160 words for a clear explanation, accurate passive voice, and neutral attribution. Avoid requiring unsupported claims about real crises.',
  45: 'Evaluate 160–200 words for a coherent third-conditional scenario and accurate tense form. Several answers are valid; accept a clearly labeled fictional scenario.',
  46: 'Evaluate 160–200 words for accurate modal-perfect forms, clear reasoning about past decisions, and organized support. Accept a fictional scenario when labeled.',
  47: 'Evaluate 160–200 words for accurate if only/wish regret forms and clear consequences. A fictional regret is acceptable; do not require personal disclosure.',
  48: 'Evaluate 160–200 words for accurate could/may/might have forms, precise neutral historical framing, and a clear distinction between possibility and certainty. Accept a clearly labeled fictional scenario.',
  49: 'Evaluate 170–200 words for accurate in case/if contrast, clear organization, and precise neutral discussion of the public issue. Accept a clearly labeled fictional or general alternative; do not require specialized medical knowledge.',
  50: 'Evaluate 160–200 words for accurate unreal-condition and wish forms, clear reasoning, and respectful treatment of health topics. Accept a fictional or neutral alternative.',
  51: 'Evaluate 160–200 words for accurate past counterfactual or mixed-conditional forms and a clear comparison of outcomes. Accept a clearly labeled fictional scenario.',
  52: 'Evaluate 160–200 words for accurate future-perfect and future-perfect-continuous contrasts, visible time markers, and a clear plan or projection. Treat “Where will we have gotten…?” as valid.',
  53: 'Evaluate 160–200 words for accurate past-to-present mixed conditionals, precise historical references, and a clear distinction between evidence and fiction. Do not generalize a religious community.',
  54: 'Evaluate 160–200 words for accurate present-to-past mixed conditionals, a clear antecedent/result relationship, and organized support. Accept a fictional life scenario.',
  55: 'Evaluate 160–200 words for the future-to-past mixed conditional function, accurate grammar, and balanced, respectful discussion of a social issue. Accept the feminist movement or another clearly framed public issue.',
  56: 'Evaluate 160–200 words for accurate nominalization, including a gerund, infinitive clause, or relative clause, with clear organization. Accept a clearly labeled fictional scenario.',
};
const contextFor = (prompt, criteria) => `Evaluate the learner response against the authored source prompt.\n\nAuthored source prompt:\n${prompt}\n\nEvaluation criteria:\n${criteria}\n\nDo not invent source facts, speaker identities, or a single answer when the task is open response.`;
const recordingRows = (unit) => plansByUnit.get(unit).nextRows.filter((row) => row.data?.type === 'recording');
for (const unit of units) {
  const rows = recordingRows(unit);
  if (!rows.length) throw new Error(`Unit ${unit} has no recording row`);
  const oralRows = rows.filter((row) => !((unit === 38 && row.id.endsWith('-036')) || (unit === 51 && row.id.endsWith('-026'))));
  for (const row of oralRows) replace(unit, row, 'Expand the oral task into concise, topic-specific scaffolding without inventing audio facts.', ['data', 'turns'], turnsFor(unit));
}

const u38Writing = rowFor(38, (row) => row.id.endsWith('-036'));
replace(38, u38Writing, 'Convert the published E writing task from recording to essay while preserving its source prompt and word range.', ['type'], 'essay');
remove(38, u38Writing, 'Remove the recording-only instruction after conversion to an essay.', ['instruction']);
replace(38, u38Writing, 'Expose the authored E task as the essay prompt.', ['prompt'], 'E. Write a 120–160 word text about chores or activities bosses normally have people do at work. Explain which requests are acceptable, include one experience or clearly labeled fictional example, and use causative structures.');
replace(38, u38Writing, 'Keep the published E word range on the essay.', ['minWords'], 120);
replace(38, u38Writing, 'Keep the published E word range on the essay.', ['maxWords'], 160);
remove(38, u38Writing, 'Remove the incompatible guided conversation role.', ['data', 'guidedRole']);
remove(38, u38Writing, 'Remove the incompatible single conversation turn.', ['data', 'turns']);
remove(38, u38Writing, 'Remove the recording learner prompt after conversion to an essay.', ['data', 'learnerPrompt']);
replace(38, u38Writing, 'Mark the review as written work instead of roleplay-and-writing.', ['data', 'exerciseReview', 'kind'], 'writing');
replace(38, u38Writing, 'Use concise writing evaluation criteria for the converted essay.', ['data', 'aiGradingContext'], contextFor('E. Write a 120–160 word text about chores or activities bosses normally have people do at work. Explain which requests are acceptable, include one experience or clearly labeled fictional example, and use causative structures.', finalEssayCriteria[38]));

const u39Text = rowFor(39, (row) => row.id.includes('text-8-phrasal-verb-formation'));
replace(39, u39Text, 'Remove the unrelated anime URL and correct the learner-facing phrasal-verb instruction.', ['content'], '<p>Phrasal Verb Formation Examples</p><p><strong>1 Verb + Preposition:</strong> We need to look after the babies. John stood by them all the time. Consult a reliable phrasal-verb reference for more examples.</p><p><strong>2 Verb + Adverb:</strong> The thieves just ran away. They turned up badly.</p><p><strong>3 Verb + Adverb + Preposition:</strong> I was taken with the presentation they did. The family is bearing up under the trials.</p><p>Everyday communication uses phrasal verbs to express ideas naturally. Learn each verb in context.</p>');

const u40Text = rowFor(40, (row) => row.id.includes('text-11-we-can-use-these-verbs'));
replace(40, u40Text, 'Rewrite the delexical-verb instruction so it describes collocations rather than a literal translation.', ['content'], '<p>We can use these verbs to express the following ideas.</p><p>In many common collocations, a familiar verb combines with a noun to express a specific meaning. Study each delexical structure in context.</p><p>Use the collocations to communicate the intended meaning; do not translate the verb literally.</p>');

const u41Short = rowFor(41, (row) => row.id.includes('short-answer-15-15-024'));
const u41Answers = [
  { question: 'C. Read the paragraph and quote one complete past-perfect clause that shows an earlier event.', correctAnswer: "I'd been invited to a party.", acceptedAnswers: ["I'd been invited to a party.", 'I had been invited to a party.'] },
  { question: 'C. Read the paragraph and quote another complete past-perfect clause that shows an earlier event.', correctAnswer: "I'd lent my car to my son the day before.", acceptedAnswers: ["I'd lent my car to my son the day before.", 'I had lent my car to my son the day before.'] },
];
for (const [index, answer] of u41Answers.entries()) {
  replace(41, u41Short, 'Align the extraction item with the unit past-perfect objective and accept the authored contractions.', ['items', index, 'question'], answer.question);
  replace(41, u41Short, 'Use source-grounded past-perfect answers rather than delexical-verb labels.', ['items', index, 'correctAnswer'], answer.correctAnswer);
  replace(41, u41Short, 'Accept the contracted and uncontracted source-grounded past-perfect forms.', ['items', index, 'acceptedAnswers'], answer.acceptedAnswers);
}
replace(41, u41Short, 'Give the open extraction task concise past-perfect evaluation context.', ['data', 'aiGradingContext'], contextFor('Extract past-perfect forms from the reading and explain the earlier event they describe.', 'Accept complete source-grounded clauses with equivalent contraction or expansion. Do not require delexical-verb labels or exact punctuation.'));

const u42Short = rowFor(42, (row) => row.id.includes('short-answer-13-a-write-the-correct-reported-speech'));
const u42Answers = [
  ['Direct statement: “I did not do my homework.” Report it. The speaker is unspecified.', 'They said that they had not done their homework.', ['They said that they had not done their homework.', "They said they hadn't done their homework."]],
  ['Direct statement: “We will definitely get that spot.” Report it. The speakers are unspecified.', 'They said that they would definitely get that spot.', ['They said that they would definitely get that spot.', 'They said they would definitely get that spot.', "They said they'd definitely get that spot."]],
  ['Direct statement: “I was watching TV and you called.” Report it. The speaker is unspecified.', 'They said that they had been watching TV when I called.', ["They said that they had been watching TV when I called.", "They said they'd been watching TV when I called."]],
  ['Direct request: “Don’t open the windows, please.” Report it. The speaker is unspecified.', 'They asked me not to open the windows.', ['They asked me not to open the windows.', 'They asked me not to open the windows, please.']],
  ['Direct statement: “I normally eat cereal in the mornings.” Report it. The speaker is unspecified.', 'They said that they normally ate cereal in the mornings.', ['They said that they normally ate cereal in the mornings.', 'They said they normally ate cereal in the mornings.']],
  ['Direct statement: “We are having a terrible day.” Report it. The speakers are unspecified.', 'They said that they were having a terrible day.', ['They said that they were having a terrible day.', 'They said they were having a terrible day.']],
  ['Direct statement: “I may call her.” Report it. The speaker is unspecified.', 'They said that they might call her.', ['They said that they might call her.', 'They said they might call her.']],
  ['Direct statement: “We should smoke outside.” Report it. The speakers are unspecified.', 'They said that they should smoke outside.', ['They said that they should smoke outside.', 'They said they should smoke outside.']],
  ['Direct statement: “I cannot take this schedule now.” Report it. The speaker is unspecified.', 'They said that they could not take that schedule then.', ["They said that they could not take that schedule then.", "They said they couldn't take that schedule then."]],
];
for (const [index, [question, correctAnswer, acceptedAnswers]] of u42Answers.entries()) {
  replace(42, u42Short, 'Show the authored direct statement and neutral speaker context in every reported-speech item.', ['items', index, 'question'], question);
  replace(42, u42Short, 'Use a neutral they report because the authored source does not identify a speaker.', ['items', index, 'correctAnswer'], correctAnswer);
  replace(42, u42Short, 'Accept that-optional and contraction variants without inventing a speaker identity.', ['items', index, 'acceptedAnswers'], acceptedAnswers);
}
replace(42, u42Short, 'Record the direct statements and neutral grading policy for reported speech.', ['data', 'aiGradingContext'], contextFor('Report each authored direct statement using a neutral, unspecified speaker.', 'Accept that-optional forms, standard contractions, and they as the neutral pronoun. Do not require an invented speaker name, gender, or reporting location.'));

const u43Table = rowFor(43, (row) => row.id.includes('structured-content-9-structures-questions-tag-questions'));
replace(43, u43Table, 'Correct the duplicated verb and the modal tag while preserving the tag-question lesson.', ['content', 'rows'], [
  ['Past Perfect', 'Had Mike taken English lessons by 2020?', "He had taken English lessons by 2020, hadn't he?"],
  ['Modals', 'Can you come with me? Would they join us? Should she call first? Must they have a review?', 'You can’t come with me, can you? They would join us, wouldn’t they? She should call first, shouldn’t she? They must have a review, mustn’t they?'],
  ['To Consider Tag questions are used at the end of sentences. They can be used with any tense. If the statement is positive, the tag is negative; if the statement is negative, the tag is positive. With I, use aren’t I. Let’s takes shall we, and imperatives take will you. Affirmative tags after affirmative statements can express interest or surprise.', '', ''],
]);
const u44Table = rowFor(44, (row) => row.id.includes('structured-content-8-structures-active-voice-passive-voice'));
replace(44, u44Table, 'Use the idiomatic material passive made of plastic.', ['content', 'rows'], [
  ['To be + Past Participle', 'They build the building in glass.', 'The building is built in glass.'], ['', 'Someone stole my car yesterday.', 'My car was stolen yesterday.'], ['', 'Those are plastic chairs.', 'Those chairs are made of plastic.'], ['To be + Past Participle + by', 'Alex will finish the job tonight.', 'The job will be finished by Alex tonight.'], ['', 'John has done the house chores lately.', 'The house chores have been done by John lately.'], ['', 'Tim had borne in mind this idea for ages.', 'This idea had been borne in mind by Tim for ages.'],
]);
const u46Table = rowFor(46, (row) => row.id.includes('structured-content-8-we-are-able-to-express-opinions'));
replace(46, u46Table, 'Correct the auxiliary order and align the question with the would-have function.', ['content', 'rows'], [
  ['Should Have + Past Participle', 'Dylan should have called them before going.', 'What should he have done before going?'], ['', 'If it had been me, I should have brought more money.', 'What should you have done?'], ['Would have + Past Participle', 'My family would have wanted him to be different, but he wasn’t.', 'How would your family have wanted him to be?'], ['', 'He would not have expected me to drop school.', 'Would he have expected you to drop school?'], ['Must have + Past Participle', 'We must have seen the straw in the wind, but we did not.', 'Would you have seen the straw in the wind?'], ['', 'If he had not done things that way, the boss must have given him the chance.', 'What if he had not done things that way?'],
]);
const u47Table = rowFor(47, (row) => row.id.includes('structured-content-6-phrases-meaning-example-sing-the-blues'));
replace(47, u47Table, 'Separate lose heart from lose one’s heart and keep the regret vocabulary distinct.', ['content', 'rows'], [
  ['SING THE BLUES', 'To feel sorrow or be sad about something.', 'You should not have sung the blues while looking for her.'], ['CRY OVER SPILLED MILK', 'To be upset about something that happened and cannot be changed.', 'Don’t cry over spilled milk; you have to do something now.'], ["EAT SOMEONE'S HEART OUT", 'To feel very sad or mentally pained.', 'It ate my heart out to see her with someone else.'], ['COLD FEET', 'An attitude that prevents someone from continuing with a course of action.', 'Rachel left Barry at the altar because she got cold feet.'], ['EAT CROW', 'To admit having been proven wrong after taking a strong position.', 'How does it feel to eat crow, John?'], ['LOSE HEART', 'To lose courage or give up out of despair.', 'I almost lost heart while waiting for an answer.'], ['LOSE ONE’S HEART', 'To fall deeply in love.', 'She lost her heart to the music.'], ['RAW DEAL', 'An unfair way of treating someone.', 'That was such a raw deal with Jen.'], ['SIT ON THE FENCE', 'A lack of ability to decide something.', 'I regret sitting on the fence about Diane.'],
]);
const u48Table = rowFor(48, (row) => row.id.includes('structured-content-8-structures-statements-questions-could-have'));
replace(48, u48Table, 'Align modal-perfect examples with past possibility and natural question forms.', ['content', 'rows'], [
  ['Could + Have + Past Participle', 'I could have gotten lost if we had not seen them on time.', 'What could have happened to them?'], ['', 'You could have said that before everything went wrong.', 'What could I have said?'], ['May + Have + Past Participle', 'John may have caught that flu at the hospital.', 'Where may John have caught that flu?'], ['', 'We may have called a few times, but he never picked up.', 'Why may he have missed the calls?'], ['Might + Have + Past Participle', 'I might have eaten a cheeseburger once.', 'Could you have eaten a burger even if you were vegetarian?'], ['', 'They might have been here, but they are gone now.', 'Were they here before?'],
]);
const u49Reading = rowFor(49, (row) => row.id.includes('text-14-14-022'));
replace(49, u49Reading, 'Add a minimum glossary and an explicit in-case/if contrast to reduce technical reading load.', ['content'], `${u49Reading.data.content}<p><strong>Glossary:</strong> ACE2 is a receptor used by some viruses to enter cells; fibrosis is scar tissue; apoptosis is programmed cell death.</p><p><strong>Language focus:</strong> Use <em>in case</em> for a precaution (“Take notes in case you need to review them”) and <em>if</em> for a condition (“If you need help, ask your teacher”).</p>`);
const u50Table = rowFor(50, (row) => row.id.includes('structured-content-6-phrases-meaning-example-feel-the-pinch'));
replace(50, u50Table, 'Correct the phrasal heading to see fit and preserve the idiom meaning.', ['content', 'rows'], [
  ['FEEL THE PINCH', 'To experience hardship, especially financial.', 'Staff, we’re beginning to feel the pinch as the dispute entered its third week.'], ['SEE FIT', 'To consider it correct or acceptable to do something.', 'Why did the company see fit to give you the job?'], ['KNOCK ON WOOD', 'Said after a confident or positive statement to express hope that good luck will continue.', "I haven't been banned yet, knock on wood."], ['FIRE IN THE BELLY', 'A powerful sense of ambition or determination.', 'He lacks the fire in his belly necessary to seek the presidency.'], ['HOPE AGAINST HOPE', 'To hope or wish with little reason or justification.', "I'm hoping against hope that someone will return my wallet."], ['FOOL’S PARADISE', 'A state of happiness based on not knowing about or denying potential trouble.', "They were living in a fool's paradise, refusing to accept that they were in debt."], ['BRASS RING', 'A very desirable prize, goal, or opportunity.', 'He made his first try for the brass ring when he ran for mayor.'], ['GAME PLAN', 'A strategy worked out in advance, especially in sports, politics, or business.', 'If he has a game plan for winning the deal, only he understands it.'],
]);

const u51Text = rowFor(51, (row) => row.id.includes('text-8-we-are-able-to-express-ideas'));
replace(51, u51Text, 'Correct the modal-perfect question order while preserving the past counterfactual function.', ['content'], '<p>We are able to express ideas about things or events that did not happen through different expressions and regular grammar.</p><p>PHRASES EXAMPLES What if… What if Charles had taken Mary to the party? He would have ended up there! Imagine that / if… Imagine you hadn’t called Joe’s parents; when would they have known? Suppose / Supposing that Supposing we had not gone to the doctor, we could have gotten worse. I wish… I wish I had called her; now, I will never know if she felt the same for me. To Consider: We work with these phrases using the past perfect. Could and would help express the imagined result, and other modals may fit the context.</p>');
const u51Oral = rowFor(51, (row) => row.id.endsWith('-025'));
const u51OralPrompt = 'D. Discuss a global disaster that was predicted but did not happen. What might have happened if it had become reality? Where might that have led us?';
replace(51, u51Oral, 'Correct the oral task wording while keeping the past counterfactual function.', ['instruction'], u51OralPrompt);
replace(51, u51Oral, 'Keep the learner-facing oral prompt concise and grammatical.', ['data', 'learnerPrompt'], u51OralPrompt);
const u51Writing = rowFor(51, (row) => row.id.endsWith('-026'));
replace(51, u51Writing, 'Convert the published E writing task from recording to essay while preserving its source prompt and word range.', ['type'], 'essay');
remove(51, u51Writing, 'Remove the recording-only instruction after conversion to an essay.', ['instruction']);
replace(51, u51Writing, 'Expose the authored E task as the essay prompt.', ['prompt'], 'E. Write a 160–200 word text about a counterfactual career or life decision. Explain what might have happened if you had chosen a different path, and label fictional details clearly. Use the past counterfactual grammar studied.');
replace(51, u51Writing, 'Keep the published E word range on the essay.', ['minWords'], 160);
replace(51, u51Writing, 'Keep the published E word range on the essay.', ['maxWords'], 200);
remove(51, u51Writing, 'Remove the incompatible guided conversation role.', ['data', 'guidedRole']);
remove(51, u51Writing, 'Remove the incompatible single conversation turn.', ['data', 'turns']);
remove(51, u51Writing, 'Remove the recording learner prompt after conversion to an essay.', ['data', 'learnerPrompt']);
replace(51, u51Writing, 'Mark the review as written work instead of roleplay-and-writing.', ['data', 'exerciseReview', 'kind'], 'writing');
replace(51, u51Writing, 'Use concise writing evaluation criteria for the converted essay.', ['data', 'aiGradingContext'], contextFor('E. Write a 160–200 word text about a counterfactual career or life decision. Explain what might have happened if you had chosen a different path, and label fictional details clearly. Use the past counterfactual grammar studied.', finalEssayCriteria[51]));

const u52Functions = rowFor(52, (row) => row.id.includes('structured-content-10-we-can-use-the-grammar-presented'));
replace(52, u52Functions, 'Make the future-perfect and future-perfect-continuous contrast visible with a concise time model.', ['content'], {
  headers: ['', 'Functions', 'Examples'],
  rows: [
    ['1', 'Talk about events that will be completed before a specific time in the future.', 'Joseph will have left by the time she realizes his feelings.'],
    ['2', 'Contrast completion with an action that will be in progress at a future time.', 'By 2035, the team will have finished the project; at 10 a.m., they will have been working for two hours.'],
    ['3', 'Express actions that will be in progress at a specific time in the future.', 'The police will be setting a perimeter once the concert starts.'],
  ],
});
replace(52, u52Functions, 'Add a clear timeline cue without changing the valid future-perfect question.', ['subtitle'], 'Timeline cue: completed before a future point = will have + past participle; ongoing up to that point = will have been + -ing.');
const u52Exercise = rowFor(52, (row) => row.id.includes('structured-content-12-a-using-the-grammar-learned'));
replace(52, u52Exercise, 'Add a model and time-marker guidance to the future-perfect production task.', ['content'], {
  headers: ['0. Jake will have taken the chance with Annie in two weeks’ time.', 'Model: By Friday, Jake will have finished the course.'],
  rows: Array.from({ length: 8 }, () => ['', '']),
});

const u53Oral = rowFor(53, (row) => row.data?.type === 'recording');
const u53OralPrompt = 'D. Discuss a clearly labeled fictional historical scenario in which Nazi Germany won the war. Explain possible effects on the present and distinguish evidence from imagination.';
replace(53, u53Oral, 'Frame the historical counterfactual precisely and avoid generalizing a community.', ['instruction'], u53OralPrompt);
replace(53, u53Oral, 'Keep the learner-facing historical prompt neutral and precise.', ['data', 'learnerPrompt'], u53OralPrompt);
replace(53, u53Oral, 'Use neutral historical evaluation context without generalizing a religious community.', ['data', 'aiGradingContext'], contextFor(u53OralPrompt, 'Evaluate the oral response for precise historical references, accurate past-to-present mixed conditionals, and a clear distinction between evidence and imagined consequences. Do not require invented speaker facts or generalize a religious community.'));
const u53Essay = rowFor(53, (row) => row.id.includes('essay-15-d-make-a-small-presentation'));
const u53EssayPrompt = 'E. Write a 160–200 word text about the September 11, 2001 attacks and a clearly labeled counterfactual scenario. Use a past-to-present mixed conditional to explain how the present might differ if the attacks had not occurred; refer to the specific attacks and al-Qaeda, avoid generalizing a religious community, distinguish historical evidence from imagined details, and state your position.';
replace(53, u53Essay, 'Replace imprecise historical and religious generalization with a precise, evidence-aware mixed-conditional task.', ['prompt'], u53EssayPrompt);
replace(53, u53Essay, 'Use concise neutral evaluation criteria for the historical essay.', ['data', 'aiGradingContext'], contextFor(u53EssayPrompt, finalEssayCriteria[53]));

const u54Table = rowFor(54, (row) => row.id.includes('structured-content-8-we-can-use-mixed-conditionals'));
replace(54, u54Table, 'Remove the double negative and make each mixed-conditional result clear.', ['content'], {
  headers: ['A HYPOTHETICAL PRESENT', 'A RESULT IN THE PAST'],
  rows: [
    ['If they were more punctual,', 'they wouldn’t have missed the start.'],
    ['If John did not push my buttons,', 'I would not have reacted so strongly.'],
    ['If she were as bold as brass,', 'she would have earned a higher position in the company.'],
  ],
});
replace(54, u54Table, 'Clarify the present-condition and past-result evaluation cue.', ['subtitle'], 'Mixed conditional: use a present hypothetical condition with would have + past participle for the past result.');
const u54Oral = rowFor(54, (row) => row.data?.type === 'recording');
const u54OralPrompt = 'D. Discuss a historical event that might have had a different outcome if people had acted or explained the facts differently. State one present condition with a past result.';
replace(54, u54Oral, 'Correct the history prompt while retaining the present-to-past mixed conditional.', ['instruction'], u54OralPrompt);
replace(54, u54Oral, 'Keep the learner-facing history prompt grammatical and neutral.', ['data', 'learnerPrompt'], u54OralPrompt);

const u55Oral = rowFor(55, (row) => row.data?.type === 'recording');
const u55OralPrompt = 'D. Discuss one or two difficult moments for humanity in the past two years. How might their effects have differed if they had not had a global impact? Use the mixed conditional studied.';
replace(55, u55Oral, 'Correct the oral prompt and retain the future-to-past conditional function.', ['instruction'], u55OralPrompt);
replace(55, u55Oral, 'Keep the learner-facing social-topic prompt concise and balanced.', ['data', 'learnerPrompt'], u55OralPrompt);
const u55Essay = rowFor(55, (row) => row.id.includes('essay-15-d-make-a-small-presentation'));
const u55EssayPrompt = 'E. Write a 160–200 word text about the feminist movement or another clearly framed public issue. Use the future-to-past mixed conditional: “If people were going to accept it fully, wouldn’t they have acted already?” Present more than one perspective, explain the possible past result, and state your position respectfully.';
replace(55, u55Essay, 'Remove the duplicated accept and preserve the future-to-past mixed conditional with balanced framing.', ['prompt'], u55EssayPrompt);
replace(55, u55Essay, 'Use concise, balanced evaluation criteria for the social-issue essay.', ['data', 'aiGradingContext'], contextFor(u55EssayPrompt, finalEssayCriteria[55]));

const u56Table = rowFor(56, (row) => row.id.includes('structured-content-8-we-consider-right-phrases'));
replace(56, u56Table, 'Correct the infinitive complement while preserving nominalization as the grammar function.', ['content'], {
  headers: ['STRUCTURES', 'EXAMPLES'],
  rows: [
    ['Gerunds as nouns + complements', 'Learning quantum physics requires great discipline.'],
    ['Infinitive clauses + complements', 'To design these crafts will change the way we see space.'],
    ['Relative pronouns', 'What I don’t get is all those references.'],
  ],
});
const u56Oral = rowFor(56, (row) => row.data?.type === 'recording');
const u56OralPrompt = 'D. Discuss two difficult decisions people may face. What factors influence each choice, and what alternatives might they have? Use the language studied.';
replace(56, u56Oral, 'Make the oral decision prompt concise and neutral without inventing facts.', ['instruction'], u56OralPrompt);
replace(56, u56Oral, 'Keep the learner-facing decision prompt concise and neutral.', ['data', 'learnerPrompt'], u56OralPrompt);
const u56Essay = rowFor(56, (row) => row.id.includes('essay-15-d-make-a-small-presentation'));
replace(56, u56Essay, 'Add concise criteria and a model allowance for the final nominalization essay.', ['data', 'aiGradingContext'], contextFor(u56Essay.data.prompt, finalEssayCriteria[56]));

for (const unit of units) {
  if ([38, 51, 53, 55, 56].includes(unit)) continue;
  const finalEssay = plansByUnit.get(unit).nextRows
    .filter((row) => row.data?.type === 'essay' && /^E\./.test(row.data?.prompt ?? ''))
    .sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0];
  if (!finalEssay) throw new Error(`Could not resolve final essay for Unit ${unit}`);
  replace(unit, finalEssay, 'Use concise, source-grounded written evaluation criteria for the final essay.', ['data', 'aiGradingContext'], contextFor(finalEssay.data.prompt, finalEssayCriteria[unit]));
}

const coveredUnits = new Set(patches.map((entry) => entry.unit));
for (const unit of units) if (!coveredUnits.has(unit)) throw new Error(`Unit ${unit} has no patch entry`);
for (const entry of patches) {
  const paths = entry.changes.map((change) => JSON.stringify(change.path));
  if (new Set(paths).size !== paths.length) throw new Error(`Duplicate path in Unit ${entry.unit} row ${entry.rowId}`);
}

const patchOutput = { schemaVersion: 1, units, patches };
fs.mkdirSync(path.join(root, 'docs/audit/pedagogy'), { recursive: true });
fs.writeFileSync(path.join(root, patchPath), `${JSON.stringify(patchOutput, null, 2)}\n`);

if (fs.existsSync(reportPath)) {
  const report = readJson(reportPath);
  const reportNotes = {
    38: 'E is an essay with a causative prompt and word limits; the intentional correction-exercise errors remain authored content and are not bugs.',
    39: 'The unrelated anime URL is removed from learner content; the original source payload remains immutable.',
    40: 'The delexical-verb explanation is corrected to describe contextual collocations.',
    41: 'Extraction items now target source-grounded past-perfect clauses and accept contracted or expanded forms.',
    42: 'Every item shows its actual authored direct statement or request and uses an unspecified neutral speaker; no speaker facts were invented.',
    43: 'Tag-question examples are grammatical and retain the discourse-function guidance.',
    44: 'The material passive uses made of plastic while preserving the active/passive objective.',
    45: 'The open historical counterfactual writing task remains open response with concise criteria.',
    46: 'The modal-perfect question order is corrected without changing the advice, inference, and imagined-result functions.',
    47: 'Lose heart and lose one’s heart are separated so the idiom meanings are distinct.',
    48: 'Modal-perfect examples use natural questions and preserve possibility rather than certainty.',
    49: 'A minimal glossary and an explicit in-case/if contrast support the technical reading.',
    50: 'The headings are corrected to feel the pinch and see fit.',
    51: 'E is an essay with a past-counterfactual prompt and word limits; the oral prompt keeps the source grammar function.',
    52: 'Future-perfect completion and duration are made explicit; “Where will we have gotten…?” is valid and remains unchanged.',
    53: 'The historical task names the September 11 attacks and al-Qaeda precisely, labels fiction, and avoids generalizing a religious community.',
    54: 'The double negative is removed while retaining present-to-past mixed conditionals.',
    55: 'The future-to-past mixed conditional is preserved while the social-issue prompt is balanced and grammatical.',
    56: 'The infinitive complement is corrected while nominalization remains the grammar target.',
  };
  const immutableFields = ['originalIDs', 'originalIds', 'originalSource', 'sourceText', 'nativeParagraphs', 'teacher_notes', 'audiosURL', 'transcripts', 'SHA', 'sha256', 'scenes', 'sourceSlides', 'URLs', 'learningRevision'];
  for (const unit of units) {
    const entry = report.find((candidate) => candidate.unit === unit);
    if (!entry) throw new Error(`Unit ${unit} is missing from the pedagogical report`);
    const unitPatches = patches.filter((candidate) => candidate.unit === unit);
    entry.verifiedErrors = unitPatches.flatMap((candidate) => candidate.changes.map((change) => ({ rowId: candidate.rowId, path: change.path, before: change.before, after: change.after })));
    entry.evaluationContext = {
      status: 'verified-and-patched',
      lessonId: plansByUnit.get(unit).lessonId,
      sourceBaseline: entry.source,
      notes: reportNotes[unit],
      writtenCriteria: finalEssayCriteria[unit],
      immutableFields,
    };
  }
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(JSON.stringify({ units, patchCount: patches.length, changeCount: patches.reduce((count, entry) => count + entry.changes.length, 0), patchPath, reportPath }, null, 2));
