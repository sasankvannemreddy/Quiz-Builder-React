import React, { useEffect, useMemo, useState } from 'react'

const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value))
const uid = () => Date.now() + Math.floor(Math.random() * 10000)
const initialQuestion = () => ({ id: uid(), type: 'mcq', text: '', options: ['', '', '', ''], answer: '0', points: 1 })

export default function App() {
  const [users, setUsers] = useState(() => read('qb_users', []))
  const [quizzes, setQuizzes] = useState(() => read('qb_quizzes', []))
  const [attempts, setAttempts] = useState(() => read('qb_attempts', []))
  const [user, setUser] = useState(() => read('qb_session', null))
  const [page, setPage] = useState(() => read('qb_session', null) ? (read('qb_session', null).role === 'admin' ? 'admin' : 'user') : 'home')
  const [authMode, setAuthMode] = useState('login')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })
  const [editingId, setEditingId] = useState(null)
  const [quizForm, setQuizForm] = useState({ title: '', description: '', questions: [initialQuestion()] })
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [roomCode, setRoomCode] = useState('')
  const [roomName, setRoomName] = useState('')

  useEffect(() => write('qb_users', users), [users])
  useEffect(() => write('qb_quizzes', quizzes), [quizzes])
  useEffect(() => write('qb_attempts', attempts), [attempts])
  useEffect(() => write('qb_session', user), [user])

  const stats = useMemo(() => ({
    quizzes: quizzes.length,
    users: users.filter(u => u.role === 'user').length,
    attempts: attempts.length,
    average: attempts.length ? Math.round(attempts.reduce((n, a) => n + a.percent, 0) / attempts.length) : 0
  }), [quizzes, users, attempts])

  function go(next) { setMessage(''); setPage(next); window.scrollTo(0, 0) }
  function logout() { setUser(null); localStorage.removeItem('qb_session'); setActiveQuiz(null); go('home') }

  function submitAuth(e) {
    e.preventDefault()
    const email = form.email.trim().toLowerCase()
    if (!email || !form.password || (authMode === 'signup' && !form.name.trim())) return setMessage('Please complete all required fields.')
    if (authMode === 'signup') {
      if (users.some(u => u.email === email)) return setMessage('An account with this email already exists.')
      const newUser = { id: uid(), name: form.name.trim(), email, password: form.password, role: form.role }
      setUsers([...users, newUser]); setUser(newUser); go(newUser.role === 'admin' ? 'admin' : 'user')
    } else {
      const found = users.find(u => u.email === email && u.password === form.password)
      if (!found) return setMessage('Invalid email or password. Please sign up first.')
      setUser(found); go(found.role === 'admin' ? 'admin' : 'user')
    }
  }

  function updateQuestion(id, patch) {
    setQuizForm(f => ({ ...f, questions: f.questions.map(q => q.id === id ? { ...q, ...patch } : q) }))
  }
  function saveQuiz(e) {
    e.preventDefault()
    if (!quizForm.title.trim()) return setMessage('Enter a quiz title.')
    if (!quizForm.questions.length || quizForm.questions.some(q => !q.text.trim())) return setMessage('Enter text for every question.')
    for (const q of quizForm.questions) {
      if (q.type === 'mcq' && (q.options.some(o => !o.trim()) || Number(q.answer) < 0 || Number(q.answer) > 3)) return setMessage('Complete all MCQ options and choose the correct answer.')
      if (q.type === 'truefalse' && !['true', 'false'].includes(q.answer)) return setMessage('Choose the correct True/False answer.')
      if (q.type === 'open' && !q.answer.trim()) return setMessage('Add an expected answer for each open-ended question.')
    }
    const item = { ...quizForm, id: editingId || uid(), createdBy: user.email, updatedAt: new Date().toISOString() }
    setQuizzes(old => editingId ? old.map(q => q.id === editingId ? item : q) : [...old, item])
    setEditingId(null); setQuizForm({ title: '', description: '', questions: [initialQuestion()] }); setMessage('Quiz saved successfully.')
  }
  function editQuiz(q) {
    setEditingId(q.id); setQuizForm({ title: q.title, description: q.description || '', questions: q.questions.map(x => ({ ...x })) }); go('create')
  }
  function deleteQuiz(id) {
    if (confirm('Delete this quiz?')) setQuizzes(quizzes.filter(q => q.id !== id))
  }
  function startQuiz(quiz) {
    const ordered = [...quiz.questions]
    for (let i = ordered.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ordered[i], ordered[j]] = [ordered[j], ordered[i]] }
    setActiveQuiz({ ...quiz, questions: ordered }); setQuestionIndex(0); setAnswers({}); go('take')
  }
  function finishQuiz() {
    const total = activeQuiz.questions.reduce((n, q) => n + Number(q.points || 1), 0)
    let score = 0
    const details = activeQuiz.questions.map(q => {
      const given = String(answers[q.id] ?? '').trim()
      const expected = String(q.answer ?? '').trim()
      const correct = q.type === 'open' ? given.toLowerCase() === expected.toLowerCase() : given === expected
      if (correct) score += Number(q.points || 1)
      return { question: q.text, given, expected, correct, type: q.type }
    })
    const attempt = { id: uid(), quizId: activeQuiz.id, quizTitle: activeQuiz.title, userEmail: user.email, userName: user.name, score, total, percent: total ? Math.round(score / total * 100) : 0, date: new Date().toLocaleString(), details }
    setAttempts(old => [...old, attempt]); setActiveQuiz(null); setActiveResult(attempt); go('result')
  }
  const [activeResult, setActiveResult] = useState(null)
  function joinRoom(e) {
    e.preventDefault()
    const quiz = quizzes.find(q => String(q.id).slice(-6) === roomCode.trim() || q.title.toLowerCase() === roomName.trim().toLowerCase())
    if (!quiz) return setMessage('No quiz found. Ask the admin for the quiz code (last 6 digits of quiz ID).')
    startQuiz(quiz)
  }

  const nav = user ? <header className="topbar"><button className="brand" onClick={() => go(user.role === 'admin' ? 'admin' : 'user')}>Quiz<span>Builder</span></button><div className="navright"><span className="welcome">Hi, {user.name}</span><button className="ghost" onClick={logout}>Logout</button></div></header> : null
  const quizCode = q => String(q.id).slice(-6)

  return <div className="app">
    {!user && <header className="topbar"><button className="brand" onClick={() => go('home')}>Quiz<span>Builder</span></button><div className="navright"><button className="ghost" onClick={() => { setAuthMode('login'); go('auth') }}>Login</button><button className="small" onClick={() => { setAuthMode('signup'); go('auth') }}>Sign up</button></div></header>}
    {nav}
    {page === 'home' && <main className="hero"><div className="eyebrow">LEARN · PLAY · IMPROVE</div><h1>Make learning<br/><span>interactive.</span></h1><p className="lead">Create quizzes, challenge yourself, and track your progress in one simple place.</p><div className="actions"><button onClick={() => { setAuthMode('signup'); go('auth') }}>Get started</button><button className="outline" onClick={() => { setAuthMode('login'); go('auth') }}>I already have an account</button></div><div className="featuregrid"><article><b>01 / CREATE</b><h3>Build your quiz</h3><p>Add multiple-choice, true/false, and open-ended questions.</p></article><article><b>02 / PARTICIPATE</b><h3>Take a challenge</h3><p>Attempt randomized quizzes and get your result immediately.</p></article><article><b>03 / ANALYZE</b><h3>Track progress</h3><p>Review attempts, scores, and performance reports.</p></article></div></main>}

    {page === 'auth' && <main className="auth panel"><div className="eyebrow">YOUR LEARNING SPACE</div><h2>{authMode === 'login' ? 'Welcome back' : 'Create an account'}</h2><p className="muted">{authMode === 'login' ? 'Log in to continue to Quiz Builder.' : 'Join and start creating or taking quizzes.'}</p><form onSubmit={submitAuth} className="stack">
      {authMode === 'signup' && <label>Full name<input value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Your name" /></label>}
      <label>Email address<input type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="you@example.com" /></label>
      <label>Password<input type="password" value={form.password} onChange={e => setForm({...form, password:e.target.value})} placeholder="Enter password" /></label>
      {authMode === 'signup' && <label>Account type<select value={form.role} onChange={e => setForm({...form, role:e.target.value})}><option value="user">User / Student</option><option value="admin">Admin / Teacher</option></select></label>}
      {message && <p className="message">{message}</p>}<button type="submit" className="full">{authMode === 'login' ? 'Login' : 'Create account'}</button>
    </form><p className="switch">{authMode === 'login' ? "Don't have an account?" : 'Already registered?'} <button className="textbtn" onClick={() => {setAuthMode(authMode === 'login' ? 'signup' : 'login');setMessage('')}}>{authMode === 'login' ? 'Sign up' : 'Login'}</button></p><p className="hint">Demo note: accounts are stored in this browser using Local Storage.</p></main>}

    {page === 'admin' && <main className="content"><div className="pagehead"><div><div className="eyebrow">ADMIN WORKSPACE</div><h1>Dashboard</h1><p className="muted">Manage quizzes and review learner performance.</p></div><button onClick={() => {setEditingId(null);setQuizForm({title:'',description:'',questions:[initialQuestion()]});go('create')}}>＋ Create quiz</button></div><div className="stats"><Stat label="Total quizzes" value={stats.quizzes}/><Stat label="Registered users" value={stats.users}/><Stat label="Quiz attempts" value={stats.attempts}/><Stat label="Average score" value={`${stats.average}%`}/></div><section className="section"><div className="sectiontitle"><h2>Manage quizzes</h2><span>{quizzes.length} total</span></div>{quizzes.length === 0 ? <Empty text="No quizzes yet. Create your first quiz."/> : <div className="quizgrid">{quizzes.map(q=><article className="quizcard" key={q.id}><div className="cardtop"><span className="tag">QUIZ</span><span className="muted smalltext">{q.questions.length} questions</span></div><h3>{q.title}</h3><p>{q.description || 'No description added.'}</p><p className="code">Join code: <b>{quizCode(q)}</b></p><div className="cardactions"><button className="outline" onClick={()=>editQuiz(q)}>Edit</button><button className="danger" onClick={()=>deleteQuiz(q.id)}>Delete</button></div></article>)}</div>}</section><section className="section"><div className="sectiontitle"><h2>Recent attempts</h2><button className="outline" onClick={()=>go('reports')}>View full report</button></div><AttemptsTable attempts={attempts.slice(-5).reverse()}/></section></main>}

    {page === 'create' && <main className="content narrow"><div className="pagehead"><div><div className="eyebrow">QUIZ EDITOR</div><h1>{editingId ? 'Edit quiz' : 'Create a quiz'}</h1><p className="muted">Add questions and set the expected answer for automatic scoring.</p></div><button className="outline" onClick={()=>go('admin')}>Back</button></div><form onSubmit={saveQuiz} className="panel stack"><label>Quiz title<input value={quizForm.title} onChange={e=>setQuizForm({...quizForm,title:e.target.value})} placeholder="Example: Java Basics"/></label><label>Description<textarea value={quizForm.description} onChange={e=>setQuizForm({...quizForm,description:e.target.value})} placeholder="What is this quiz about?"/></label><div className="sectiontitle"><h2>Questions</h2><span>{quizForm.questions.length} added</span></div>{quizForm.questions.map((q,i)=><div className="questioneditor" key={q.id}><div className="sectiontitle"><h3>Question {i+1}</h3>{quizForm.questions.length>1 && <button type="button" className="textbtn red" onClick={()=>setQuizForm({...quizForm,questions:quizForm.questions.filter(x=>x.id!==q.id)})}>Remove</button>}</div><label>Question type<select value={q.type} onChange={e=>updateQuestion(q.id,{type:e.target.value,answer:e.target.value==='truefalse'?'true':e.target.value==='open'?'':'0'})}><option value="mcq">Multiple choice</option><option value="truefalse">True / False</option><option value="open">Open-ended</option></select></label><label>Question text<textarea value={q.text} onChange={e=>updateQuestion(q.id,{text:e.target.value})} placeholder="Enter your question"/></label>
      {q.type==='mcq' && <><div className="optioneditor">{q.options.map((o,j)=><label key={j}>Option {j+1}<input value={o} onChange={e=>updateQuestion(q.id,{options:q.options.map((v,k)=>k===j?e.target.value:v)})} placeholder={`Option ${j+1}`}/></label>)}</div><label>Correct option<select value={q.answer} onChange={e=>updateQuestion(q.id,{answer:e.target.value})}>{q.options.map((o,j)=><option value={String(j)} key={j}>Option {j+1}{o?` — ${o}`:''}</option>)}</select></label></>}
      {q.type==='truefalse' && <label>Correct answer<select value={q.answer} onChange={e=>updateQuestion(q.id,{answer:e.target.value})}><option value="true">True</option><option value="false">False</option></select></label>}
      {q.type==='open' && <label>Expected answer <input value={q.answer} onChange={e=>updateQuestion(q.id,{answer:e.target.value})} placeholder="Exact answer used for automatic checking"/></label>}
      <label>Points<input type="number" min="1" max="100" value={q.points} onChange={e=>updateQuestion(q.id,{points:Number(e.target.value)})}/></label></div>)}
      <button type="button" className="outline full" onClick={()=>setQuizForm({...quizForm,questions:[...quizForm.questions,initialQuestion()]})}>＋ Add another question</button>{message && <p className="message">{message}</p>}<button className="full" type="submit">{editingId?'Update quiz':'Save quiz'}</button></form></main>}

    {page === 'user' && <main className="content"><div className="pagehead"><div><div className="eyebrow">STUDENT WORKSPACE</div><h1>Available quizzes</h1><p className="muted">Choose a quiz or join using the code shared by your teacher.</p></div></div><form className="joinbox" onSubmit={joinRoom}><div><b>Join a quiz</b><p className="muted">Enter the 6-digit quiz code shown by the admin.</p></div><input value={roomCode} onChange={e=>setRoomCode(e.target.value)} placeholder="Quiz code" maxLength="6"/><button>Join quiz</button></form>{message && <p className="message">{message}</p>}<div className="quizgrid">{quizzes.map(q=><article className="quizcard" key={q.id}><span className="tag">AVAILABLE</span><h3>{q.title}</h3><p>{q.description || 'Test your knowledge with this quiz.'}</p><p className="muted smalltext">{q.questions.length} questions · Code {quizCode(q)}</p><button onClick={()=>startQuiz(q)}>Start quiz</button></article>)}</div>{quizzes.length===0 && <Empty text="No quizzes published yet. Please check again later."/>}<section className="section"><h2>My recent attempts</h2><AttemptsTable attempts={attempts.filter(a=>a.userEmail===user.email).slice(-5).reverse()}/></section></main>}

    {page === 'take' && activeQuiz && <main className="content narrow"><div className="quizstage"><div className="eyebrow">QUIZ IN PROGRESS</div><div className="progressrow"><span>Question {questionIndex+1} of {activeQuiz.questions.length}</span><span>{Math.round((questionIndex+1)/activeQuiz.questions.length*100)}%</span></div><div className="progress"><i style={{width:`${(questionIndex+1)/activeQuiz.questions.length*100}%`}}/></div><h1>{activeQuiz.title}</h1>{(()=>{const q=activeQuiz.questions[questionIndex];return <div className="panel"><span className="tag">{q.type==='mcq'?'MULTIPLE CHOICE':q.type==='truefalse'?'TRUE / FALSE':'OPEN ENDED'} · {q.points} point(s)</span><h2 className="quizquestion">{q.text}</h2>{q.type==='mcq' && <div className="answerlist">{q.options.map((o,i)=><button key={i} className={`answer ${answers[q.id]===String(i)?'chosen':''}`} onClick={()=>setAnswers({...answers,[q.id]:String(i)})}>{String.fromCharCode(65+i)}. {o}</button>)}</div>}{q.type==='truefalse' && <div className="answerlist two">{['true','false'].map(v=><button key={v} className={`answer ${answers[q.id]===v?'chosen':''}`} onClick={()=>setAnswers({...answers,[q.id]:v})}>{v==='true'?'True':'False'}</button>)}</div>}{q.type==='open' && <label>Your answer<textarea value={answers[q.id]||''} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})} placeholder="Type your answer here"/></label>}<div className="quiznav"><button className="outline" disabled={questionIndex===0} onClick={()=>setQuestionIndex(questionIndex-1)}>Previous</button>{questionIndex<activeQuiz.questions.length-1?<button onClick={()=>setQuestionIndex(questionIndex+1)}>Next question</button>:<button onClick={()=>{if(activeQuiz.questions.some(q=>!String(answers[q.id]??'').trim())){if(!confirm('Some questions are unanswered. Submit anyway?'))return}finishQuiz()}}>Submit quiz</button>}</div></div>})()}</div></main>}

    {page === 'result' && activeResult && <main className="content narrow"><div className="panel resultpanel"><div className="eyebrow">QUIZ COMPLETED</div><h1>Your result</h1><div className="score">{activeResult.score}<span> / {activeResult.total}</span></div><h2>{activeResult.percent}%</h2><p className="muted">{activeResult.percent>=80?'Excellent work!':activeResult.percent>=50?'Good effort. Keep practicing!':'Keep learning and try again!'}</p><div className="review">{activeResult.details.map((d,i)=><div className="reviewitem" key={i}><b>{i+1}. {d.question}</b><p>Your answer: {d.given || 'Not answered'}</p><p>Expected answer: {d.type==='mcq'?`Option ${Number(d.expected)+1}`:d.expected}</p><span className={d.correct?'correct':'incorrect'}>{d.correct?'Correct':'Incorrect'}</span></div>)}</div><button onClick={()=>go('user')}>Back to dashboard</button></div></main>}

    {page === 'reports' && <main className="content"><div className="pagehead"><div><div className="eyebrow">PERFORMANCE</div><h1>Quiz reports</h1><p className="muted">Review all recorded quiz attempts.</p></div><button className="outline" onClick={()=>go('admin')}>Back to dashboard</button></div><div className="stats"><Stat label="Total attempts" value={stats.attempts}/><Stat label="Average score" value={`${stats.average}%`}/><Stat label="Quizzes" value={stats.quizzes}/><Stat label="Users" value={stats.users}/></div><AttemptsTable attempts={[...attempts].reverse()} detailed/></main>}
    <footer>Quiz Builder <span>·</span> React + Vite <span>·</span> Local Storage demo</footer>
  </div>
}

function Stat({label,value}) { return <div className="stat"><span>{label}</span><b>{value}</b></div> }
function Empty({text}) { return <div className="empty">{text}</div> }
function AttemptsTable({attempts,detailed=false}) {
  if (!attempts.length) return <Empty text="No quiz attempts recorded yet."/>
  return <div className="tablewrap"><table><thead><tr><th>Student</th><th>Quiz</th><th>Score</th><th>Percentage</th><th>Date</th></tr></thead><tbody>{attempts.map(a=><tr key={a.id}><td>{a.userName}</td><td>{a.quizTitle}</td><td>{a.score}/{a.total}</td><td><span className="tag">{a.percent}%</span></td><td>{a.date}</td></tr>)}</tbody></table></div>
}