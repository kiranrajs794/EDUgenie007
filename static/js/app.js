const $ = (id) => document.getElementById(id);
let currentQuiz = null;
let questionIndex = 0;
let selectedAnswers = [];
let quizChecked = false;
let currentTopic = "";
let toastTimer;

function notify(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}
function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  const view = $("view-" + name);
  if (view) view.classList.add("active");
  const labels = {home:"Overview",ask:"Ask EduGenie",quiz:"Quiz Generator",path:"Learning Path",summary:"Text Summarizer",history:"Quiz History"};
  $("pageCrumb").textContent = labels[name] || "Overview";
  $("sidebar").classList.remove("open");
  if (name === "history") loadHistory();
  if (name === "home") loadStats();
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-view]").forEach(el => el.addEventListener("click", () => showView(el.dataset.view)));
$("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));
document.querySelectorAll("[data-question]").forEach(el => el.addEventListener("click", () => {
  $("question").value = el.dataset.question;
  $("question").focus();
}));
function loading(target, message="EduGenie is preparing your response...") {
  $(target).innerHTML = `<div class="result-card loading"><span class="spinner"></span><span>${escapeHtml(message)}</span></div>`;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
async function api(url, body) {
  const response = await fetch(url, {
    method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
  return data;
}
function showError(target, error) {
  $(target).innerHTML = `<div class="result-card"><div class="result-head"><span class="mini-mark">!</span> Something went wrong</div><p class="answer-text">${escapeHtml(error.message || "Please try again.")}</p><p class="hint">Check that the AI service is running and try again.</p></div>`;
}
$("askBtn").addEventListener("click", async () => {
  const topic = $("question").value.trim();
  if (topic.length < 2) return notify("Enter a question first.");
  loading("askOutput");
  $("askBtn").disabled = true;
  try {
    const data = await api("/api/ask", {topic});
    $("askOutput").innerHTML = `<article class="result-card"><div class="result-head"><span class="mini-mark">✦</span> EduGenie's explanation</div><div class="answer-text">${escapeHtml(data.answer)}</div></article>`;
  } catch(e) { showError("askOutput",e); } finally { $("askBtn").disabled = false; }
});
$("quizBtn").addEventListener("click", async () => {
  const topic = $("quizTopic").value.trim();
  if (topic.length < 2) return notify("Enter a quiz topic first.");
  currentTopic = topic;
  loading("quizOutput","Generating your quiz...");
  $("quizBtn").disabled = true;
  try {
    currentQuiz = await api("/api/quiz", {topic,count:Number($("quizCount").value),difficulty:$("quizDifficulty").value});
    if (!currentQuiz.questions?.length) throw new Error("No questions were returned. Try again.");
    questionIndex = 0; selectedAnswers = Array(currentQuiz.questions.length).fill(null); quizChecked = false;
    renderQuestion();
  } catch(e) { showError("quizOutput",e); } finally { $("quizBtn").disabled = false; }
});
function renderQuestion() {
  const q = currentQuiz.questions[questionIndex];
  const total = currentQuiz.questions.length;
  const selected = selectedAnswers[questionIndex];
  const pct = Math.round((questionIndex/total)*100);
  $("quizOutput").innerHTML = `<div class="result-card">
    <div class="quiz-top"><span>${escapeHtml(currentQuiz.title || currentTopic)}</span><span>Question ${questionIndex+1} of ${total}</span></div>
    <div class="quiz-progress"><span style="width:${pct}%"></span></div>
    <div class="question-title">${escapeHtml(q.question)}</div>
    <div class="option-list">${q.options.map((o,i)=>{
      let cls = "option";
      if (selected === i) cls += " selected";
      if (quizChecked && i === q.answer) cls = "option correct";
      else if (quizChecked && selected === i && selected !== q.answer) cls = "option incorrect";
      return `<button class="${cls}" data-option="${i}" ${quizChecked?"disabled":""}><span class="option-letter">${"ABCD"[i]}</span><span>${escapeHtml(o)}</span></button>`;
    }).join("")}</div>
    ${quizChecked?`<div class="explanation"><strong>${selected===q.answer?"Correct!":"Review this answer"}</strong><br>${escapeHtml(q.explanation || "Review the correct option to reinforce the concept.")}</div>`:""}
    <div class="quiz-actions"><button class="text-btn" id="prevQ" ${questionIndex===0?"disabled":""}>← Previous</button>
      ${quizChecked ? `<button class="primary-btn" id="nextQ">${questionIndex===total-1?"See results":"Next question"} →</button>`:
      `<button class="primary-btn" id="checkQ" ${selected===null?"disabled":""}>Check answer →</button>`}</div>
  </div>`;
  document.querySelectorAll("[data-option]").forEach(btn=>btn.addEventListener("click",()=>{
    if(quizChecked)return;
    selectedAnswers[questionIndex]=Number(btn.dataset.option);renderQuestion();
  }));
  $("prevQ").addEventListener("click",()=>{if(questionIndex>0){questionIndex--;quizChecked=false;renderQuestion();}});
  if(quizChecked) $("nextQ").addEventListener("click",()=>{
    if(questionIndex<total-1){questionIndex++;quizChecked=false;renderQuestion();}
    else renderScore();
  });
  else $("checkQ").addEventListener("click",()=>{if(selectedAnswers[questionIndex]!==null){quizChecked=true;renderQuestion();}});
}
async function renderScore() {
  const total=currentQuiz.questions.length;
  const score=currentQuiz.questions.reduce((n,q,i)=>n+(selectedAnswers[i]===q.answer?1:0),0);
  const percent=Math.round(score/total*100);
  $("quizOutput").innerHTML=`<div class="result-card score-panel"><div class="score-circle">${percent}%</div><h2>Quiz completed!</h2><p>You scored <strong>${score} out of ${total}</strong>.<br>${percent===100?"Excellent work!":percent>=70?"Good progress. Keep practicing!":"Keep learning and try again to improve your score."}</p><button class="primary-btn" id="retryQuiz">Try another quiz →</button></div>`;
  try {await api("/api/quiz-result",{topic:currentTopic,difficulty:$("quizDifficulty").value,score,total});} catch(e){notify("Score shown, but history could not be saved.");}
  $("retryQuiz").addEventListener("click",()=>{$("quizOutput").innerHTML="";$("quizTopic").focus();});
}
$("pathBtn").addEventListener("click",async()=>{
  const topic=$("pathTopic").value.trim();if(topic.length<2)return notify("Enter a topic first.");
  loading("pathOutput","Building your learning path...");$("pathBtn").disabled=true;
  try{const data=await api("/api/learning-path",{topic});renderPath(data);}
  catch(e){showError("pathOutput",e);}finally{$("pathBtn").disabled=false;}
});
function renderPath(data){
  const stages=Array.isArray(data.stages)?data.stages:[];
  $("pathOutput").innerHTML=`<div class="result-card"><div class="result-head"><span class="mini-mark">⌁</span>${escapeHtml(data.title||"Your learning roadmap")}</div><p class="path-overview">${escapeHtml(data.overview||"A structured plan to help you build knowledge step by step.")}</p><p class="hint">Estimated duration: ${escapeHtml(data.estimated_duration||"As suggested in each stage")}</p>${stages.map((s,i)=>`<div class="path-stage"><div class="stage-head"><strong><span style="color:#8a73df;margin-right:8px">0${i+1}</span>${escapeHtml(s.level||"Stage "+(i+1))}</strong><span class="stage-duration">${escapeHtml(s.duration||"")}</span></div><div class="stage-body">${renderList("Learning goals",s.goals)}${renderList("Topics",s.topics)}${renderList("Practical activities",s.activities)}${s.checkpoint?`<h4>CHECKPOINT</h4><p>${escapeHtml(s.checkpoint)}</p>`:""}</div></div>`).join("")}</div>`;
}
function renderList(title,items){if(!Array.isArray(items)||!items.length)return "";return `<h4>${title.toUpperCase()}</h4><ul>${items.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>`;}
$("summaryBtn").addEventListener("click",async()=>{
  const text=$("passage").value.trim();if(text.length<10)return notify("Paste at least 10 characters of text.");
  loading("summaryOutput","Summarizing your passage...");$("summaryBtn").disabled=true;
  try{const data=await api("/api/summarize",{text});$("summaryOutput").innerHTML=`<div class="result-card"><div class="result-head"><span class="mini-mark">▧</span> Your summary</div><div class="answer-text">${escapeHtml(data.summary)}</div></div>`;}
  catch(e){showError("summaryOutput",e);}finally{$("summaryBtn").disabled=false;}
});
$("passage").addEventListener("input",()=>{$("charCount").textContent=`${$("passage").value.length.toLocaleString()} / 15,000 characters`;});
async function loadHistory(){
  $("historyOutput").innerHTML=`<div class="loading"><span class="spinner"></span>Loading your activity...</div>`;
  try{
    const response=await fetch("/api/history");const data=await response.json();
    const rows=data.history||[];
    if(!rows.length){$("historyOutput").innerHTML=`<div class="empty-state"><div class="empty-icon">◷</div><strong>No quiz history yet</strong><p>Complete a quiz and your results will appear here.</p></div>`;return;}
    $("historyOutput").innerHTML=rows.map(r=>`<div class="history-item"><div><strong>${escapeHtml(r.topic)}</strong><small>${escapeHtml(r.difficulty)} · ${escapeHtml(r.created_at)}</small></div><div class="history-score">${r.score}/${r.total} <span class="hint">(${Math.round(r.score/r.total*100)}%)</span></div></div>`).join("");
  }catch(e){$("historyOutput").innerHTML=`<div class="empty-state"><strong>Unable to load history</strong><p>${escapeHtml(e.message)}</p></div>`;}
}
async function loadStats(){
  try{const res=await fetch("/api/history");const rows=(await res.json()).history||[];$("statQuizzes").textContent=rows.length;const avg=rows.length?Math.round(rows.reduce((n,r)=>n+r.score/r.total*100,0)/rows.length):null;$("statAverage").textContent=avg===null?"—":avg+"%";}
  catch(e){/* dashboard remains usable if history is unavailable */}
}
loadStats();
