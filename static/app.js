const state = { view: "ask", quiz: null };
const views = {
  ask: {title:"Ask EduGenie",hero:"What would you like to learn today?",desc:"Ask a question and get a clear explanation tailored to your learning level.",label:"Your question",placeholder:"For example: Which is the largest ocean?",button:"Ask EduGenie",endpoint:"/api/ask"},
  simplify: {title:"Simplify a concept",hero:"Make complex topics easier.",desc:"Paste a topic or paragraph and let EduGenie explain it in simple language.",label:"Topic or learning material",placeholder:"Paste a paragraph or enter a concept...",button:"Simplify concept",endpoint:"/api/simplify"},
  quiz: {title:"Generate a quiz",hero:"Test what you know.",desc:"Create multiple-choice questions to practise a topic and review explanations.",label:"Quiz topic",placeholder:"For example: Pythagoras theorem",button:"Generate quiz",endpoint:"/api/quiz"},
  path: {title:"Your learning path",hero:"Build your learning journey.",desc:"Get an ordered study plan with milestones, practice, and a final project.",label:"What do you want to learn?",placeholder:"For example: SQL from beginner to advanced",button:"Create learning path",endpoint:"/api/learning-path"},
  summarize: {title:"Text summarizer",hero:"Turn long text into key ideas.",desc:"Paste educational content and receive a concise, structured summary.",label:"Text to summarize",placeholder:"Paste your educational passage here...",button:"Summarize text",endpoint:"/api/summarize"}
};
const navItems = document.querySelectorAll(".nav-item");
const input = document.getElementById("mainInput");
const submitBtn = document.getElementById("submitBtn");
const resultWrap = document.getElementById("resultWrap");
const resultContent = document.getElementById("resultContent");
const extraOptions = document.getElementById("extraOptions");
const levelSelect = document.getElementById("levelSelect");

function setView(view) {
  state.view = view;
  const config = views[view];
  navItems.forEach(item => item.classList.toggle("active", item.dataset.view === view));
  document.getElementById("pageTitle").textContent = config.title;
  document.getElementById("heroTitle").textContent = config.hero;
  document.getElementById("heroText").textContent = config.desc;
  document.getElementById("inputLabel").textContent = config.label;
  input.placeholder = config.placeholder;
  submitBtn.innerHTML = `${config.button} <span>→</span>`;
  input.value = "";
  resultWrap.hidden = true;
  resultContent.replaceChildren();
  document.getElementById("suggestions").hidden = view !== "ask";
  extraOptions.replaceChildren();
  if (view === "quiz") {
    const label = document.createElement("label");
    label.className = "option-control";
    label.textContent = "Questions ";
    const select = document.createElement("select");
    select.id = "quizCount";
    [3,5,7,10].forEach(n => { const o=document.createElement("option");o.value=n;o.textContent=n;select.append(o); });
    select.value = "5"; label.append(select); extraOptions.append(label);
  }
  document.querySelector(".sidebar").classList.remove("open");
}
navItems.forEach(item => item.addEventListener("click", () => setView(item.dataset.view)));
document.getElementById("mobileMenu").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
document.querySelectorAll(".suggestion").forEach(btn => btn.addEventListener("click", () => {input.value=btn.textContent;input.focus();}));

function showText(text, title="Your answer") {
  resultContent.replaceChildren();
  const p = document.createElement("div");
  p.textContent = text;
  resultContent.append(p);
  document.getElementById("resultTitle").textContent = title;
  resultWrap.hidden = false;
}
function showQuiz(quiz) {
  state.quiz = quiz;
  resultContent.replaceChildren();
  const title = document.createElement("p");
  title.textContent = quiz.title || "Your quiz";
  title.style.fontWeight = "700";
  resultContent.append(title);
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  questions.forEach((q, index) => {
    const section = document.createElement("section"); section.className = "quiz-question";
    const heading = document.createElement("h4"); heading.textContent = `${index+1}. ${q.question || "Question"}`; section.append(heading);
    const options = Array.isArray(q.options) ? q.options : [];
    options.forEach((option, optIndex) => {
      const label = document.createElement("label"); label.className = "quiz-option";
      const radio = document.createElement("input"); radio.type="radio";radio.name=`q${index}`;radio.value=optIndex;
      const span = document.createElement("span");span.textContent=option;
      label.append(radio,span);section.append(label);
    });
    const explain = document.createElement("div"); explain.className="explanation"; explain.hidden=true;
    explain.textContent = `Answer: ${options[q.correct_index] ?? "Not available"}. ${q.explanation || ""}`;
    section.append(explain);resultContent.append(section);
  });
  const actions = document.createElement("div");actions.className="quiz-actions";
  const check = document.createElement("button");check.className="primary-btn";check.textContent="Check answers";
  const reset = document.createElement("button");reset.className="secondary-btn";reset.textContent="Try again";
  const score = document.createElement("strong");score.style.alignSelf="center";score.style.fontSize="12px";
  check.addEventListener("click",()=>{
    let total=0;
    [...resultContent.querySelectorAll(".quiz-question")].forEach((section,i)=>{
      const q=questions[i], chosen=section.querySelector("input:checked");
      section.querySelectorAll(".quiz-option").forEach((label,j)=>{
        label.classList.toggle("correct",j===q.correct_index);
        label.classList.toggle("incorrect",!!chosen && j===Number(chosen.value) && j!==q.correct_index);
      });
      section.querySelector(".explanation").hidden=false;
      if(chosen && Number(chosen.value)===q.correct_index)total++;
    });
    score.textContent=`Score: ${total} / ${questions.length}`;
  });
  reset.addEventListener("click",()=>{resultContent.querySelectorAll("input").forEach(r=>r.checked=false);resultContent.querySelectorAll(".quiz-option").forEach(l=>l.classList.remove("correct","incorrect"));resultContent.querySelectorAll(".explanation").forEach(e=>e.hidden=true);score.textContent="";});
  actions.append(check,reset,score);resultContent.append(actions);
  document.getElementById("resultTitle").textContent="Your practice quiz";
  resultWrap.hidden=false;
}
async function submit() {
  const value=input.value.trim();
  if(!value){input.focus();return;}
  const config=views[state.view];
  const payload={level:levelSelect.value};
  if(state.view==="ask")payload.question=value;
  else if(state.view==="quiz"){payload.topic=value;payload.count=Number(document.getElementById("quizCount").value);}
  else payload.text=value;
  submitBtn.disabled=true;submitBtn.textContent="Thinking...";
  resultWrap.hidden=false;document.getElementById("resultTitle").textContent="Generating response...";
  resultContent.textContent="EduGenie is preparing your learning material. This may take a few seconds.";
  try{
    const response=await fetch(config.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await response.json();
    if(!response.ok)throw new Error(data.detail||"Request failed. Please try again.");
    if(state.view==="quiz")showQuiz(data);else showText(data.answer||"No answer was returned.",config.title);
  }catch(error){showText(error.message||"Something went wrong. Please try again.","Unable to generate response");}
  finally{submitBtn.disabled=false;submitBtn.innerHTML=`${config.button} <span>→</span>`;}
}
submitBtn.addEventListener("click",submit);
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();submit();}});
document.getElementById("copyBtn").addEventListener("click",async()=>{
  const text=resultContent.innerText;
  try{await navigator.clipboard.writeText(text);document.getElementById("copyBtn").textContent="Copied";setTimeout(()=>document.getElementById("copyBtn").textContent="Copy",1300);}
  catch{document.getElementById("copyBtn").textContent="Select to copy";}
});
setView("ask");
