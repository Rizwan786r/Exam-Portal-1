import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ====================== AUTH (LOGIN/REGISTER) ======================
function AuthView({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [isLogin, setIsLogin] = useState(true);
  const [msg, setMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const res = await axios.post('http://localhost:5000/api/login', { username, password });
        onLogin(res.data.token, res.data.role);
      } else {
        await axios.post('http://localhost:5000/api/register', { username, password, role });
        setMsg('Registered! Please login.');
        setIsLogin(true);
      }
    } catch (err) {
      setMsg('Error: ' + (err.response?.data || 'Failed'));
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <form onSubmit={handleAuth} className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl mb-4 font-bold">{isLogin ? 'Login' : 'Register'}</h2>
        {msg && <p className="text-red-500 mb-2 text-sm">{msg}</p>}
        <input className="w-full border p-2 mb-3 rounded" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
        <input type="password" className="w-full border p-2 mb-3 rounded" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        {!isLogin && (
          <select className="w-full border p-2 mb-3 rounded" value={role} onChange={e=>setRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>
        )}
        <button className="w-full bg-blue-600 text-white p-2 rounded mb-2">{isLogin ? 'Login' : 'Register'}</button>
        <button type="button" className="text-sm text-blue-500" onClick={()=>setIsLogin(!isLogin)}>
          {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
        </button>
      </form>
    </div>
  );
}

// ====================== ADMIN DASHBOARD ======================
function AdminDashboard({ token }) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [questions, setQuestions] = useState([{ q: '', options: ['', '', '', ''], answer: '' }]);
  const [message, setMessage] = useState('');

  const addQuestion = () => setQuestions([...questions, { q: '', options: ['', '', '', ''], answer: '' }]);
  const removeQuestion = (index) => setQuestions(questions.filter((_, i) => i !== index));
  
  const updateQuestion = (qIndex, field, value) => {
    const newQ = [...questions];
    if (field === 'q') newQ[qIndex].q = value;
    else newQ[qIndex].options[field] = value;
    setQuestions(newQ);
  };
  
  const setCorrectAnswer = (qIndex, optIndex) => {
    const newQ = [...questions];
    newQ[qIndex].answer = newQ[qIndex].options[optIndex];
    setQuestions(newQ);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/exams', { title, duration, questions }, { headers: { 'x-auth-token': token }});
      setMessage('✅ Exam created successfully!');
      setTitle(''); setDuration(60); setQuestions([{ q: '', options: ['', '', '', ''], answer: '' }]);
    } catch (err) { setMessage('❌ ' + (err.response?.data || 'Error')); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-3xl font-bold mb-6">🛠️ Admin: Create Exam</h1>
      {message && <p className="mb-4 text-green-600 font-semibold">{message}</p>}
      <form onSubmit={handleSubmit}>
        <input className="w-full border p-2 rounded mb-4" placeholder="Exam Title" value={title} onChange={e=>setTitle(e.target.value)} required />
        <input type="number" className="w-full border p-2 rounded mb-4" value={duration} onChange={e=>setDuration(Number(e.target.value))} required />
        <hr className="my-4" />
        {questions.map((ques, qi) => (
          <div key={qi} className="border p-4 mb-4 rounded bg-gray-50">
            <div className="flex justify-between"><h3 className="font-bold">Question {qi+1}</h3>{questions.length>1 && <button type="button" onClick={()=>removeQuestion(qi)} className="text-red-500 text-sm">Remove</button>}</div>
            <input className="w-full border p-2 rounded my-2" placeholder="Question text" value={ques.q} onChange={e=>updateQuestion(qi, 'q', e.target.value)} required />
            {ques.options.map((opt, oi) => (
              <div key={oi} className="flex items-center mb-2">
                <input type="radio" name={`correct-${qi}`} checked={ques.answer === opt && opt!==''} onChange={()=>setCorrectAnswer(qi, oi)} className="mr-2" required />
                <input className="w-full border p-2 rounded" placeholder={`Option ${oi+1}`} value={opt} onChange={e=>updateQuestion(qi, oi, e.target.value)} required />
              </div>
            ))}
          </div>
        ))}
        <button type="button" onClick={addQuestion} className="bg-gray-200 px-4 py-2 rounded mr-4">+ Add Question</button>
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">Save Exam</button>
      </form>
    </div>
  );
}

// ====================== STUDENT EXAM PORTAL ======================
function ExamPortal({ token }) {
  const [exams, setExams] = useState([]);
  const [exam, setExam] = useState(null);
  const [mode, setMode] = useState('select'); // select | preview | live
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState({});
  const [warning, setWarning] = useState('');

  useEffect(() => {
    if (mode === 'select') {
      axios.get('http://localhost:5000/api/exams', { headers: { 'x-auth-token': token }}).then(res => setExams(res.data));
    }
  }, [mode, token]);

  useEffect(() => {
    if (mode === 'live' && timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(t);
    } else if (mode === 'live' && timeLeft === 0) handleSubmit();
  }, [mode, timeLeft]);

  useEffect(() => {
    const handleBlur = () => { if (mode === 'live') setWarning('⚠️ Tab switch detected!'); };
    document.addEventListener('visibilitychange', handleBlur);
    return () => document.removeEventListener('visibilitychange', handleBlur);
  }, [mode]);

  const startExam = () => { setMode('live'); setTimeLeft(exam.duration * 60); };

  const handleSubmit = () => {
    let score = 0;
    exam.questions.forEach((q, i) => { if (answers[i] === q.answer) score++; });
    axios.post(`http://localhost:5000/api/exams/${exam._id}/submit`, { score }, { headers: { 'x-auth-token': token }});
    alert(`Submitted! Score: ${score}/${exam.questions.length}`);
    setMode('select'); setExam(null); setAnswers({});
  };

  if (mode === 'select') {
    return (
      <div className="p-6 max-w-3xl mx-auto mt-10">
        <h1 className="text-2xl font-bold mb-4">📚 Available Exams</h1>
        {exams.map(e => <button key={e._id} onClick={()=>{setExam(e); setMode('preview');}} className="block w-full text-left border p-4 mb-2 rounded hover:bg-gray-50">{e.title} ({e.duration}m)</button>)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{exam.title}</h1>
      {mode === 'preview' && (<div className="bg-blue-100 p-4 rounded mb-4"><p>👁️ Preview Mode (Timer is OFF)</p><button onClick={startExam} className="mt-2 bg-green-500 text-white px-4 py-2 rounded">Start Exam</button></div>)}
      {mode === 'live' && (<div className="flex justify-between mb-4"><span className="font-bold text-red-500">Time: {timeLeft}s</span>{warning && <span className="text-red-600">{warning}</span>}</div>)}
      {exam.questions.map((q, i) => (
        <div key={i} className="mb-6 border p-4 rounded">
          <p className="font-semibold">{i+1}. {q.q}</p>
          {q.options.map(opt => (<label key={opt} className="block mt-2"><input type="radio" name={`q${i}`} value={opt} disabled={mode==='preview'} onChange={e=>setAnswers({...answers, [i]: e.target.value})} className="mr-2" />{opt}</label>))}
        </div>
      ))}
      {mode === 'live' && (<button onClick={handleSubmit} className="bg-blue-600 text-white px-6 py-2 rounded">Submit Exam</button>)}
    </div>
  );
}

// ====================== MAIN APP ======================
export default function App() {
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');

  if (!token) return <AuthView onLogin={(t, r) => { setToken(t); setRole(r); }} />;
  
  return (
    <div className="min-h-screen bg-gray-100">
      {role === 'admin' ? <AdminDashboard token={token} /> : <ExamPortal token={token} />}
    </div>
  );
}
