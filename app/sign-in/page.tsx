'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import { supabase } from '../../lib/supabase';

export default function SignIn() {
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [mode,setMode] = useState<'sign-in'|'sign-up'>('sign-in');
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  async function submit(event:FormEvent){
    event.preventDefault(); setBusy(true); setMessage('');
    const result = mode === 'sign-in' ? await supabase.auth.signInWithPassword({email,password}) : await supabase.auth.signUp({email,password,options:{data:{full_name:email.split('@')[0]}}});
    setBusy(false);
    if(result.error) setMessage(result.error.message);
    else if(mode === 'sign-up') setMessage('Check your email to confirm your account.');
    else window.location.href = '/';
  }
  return <main className="auth-page"><section className="auth-brand"><Image src="/threshold-logo-white.png" alt="Threshold" width={200} height={75} priority/><p>Projects</p><blockquote>One shared view of what is happening, what comes next, and who owns it.</blockquote></section><section className="auth-panel"><form onSubmit={submit}><p className="eyebrow">Management workspace</p><h1>{mode==='sign-in'?'Welcome back.':'Create your account.'}</h1><p>Sign in to plan and track work across Threshold.</p><label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>Password<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='sign-in'?'current-password':'new-password'}/></label>{message&&<div className="auth-message" role="status">{message}</div>}<button className="auth-submit" disabled={busy}>{busy?'Please wait…':mode==='sign-in'?'Sign in':'Create account'}</button><button type="button" className="auth-switch" onClick={()=>setMode(mode==='sign-in'?'sign-up':'sign-in')}>{mode==='sign-in'?'New to Threshold Projects? Create an account':'Already have an account? Sign in'}</button></form></section></main>;
}
