const db = firebase.firestore();
const auth = firebase.auth();

const inviteInfo = document.getElementById('inviteInfo');
const form = document.getElementById('formAccept');

function getParam(name){ return new URL(location.href).searchParams.get(name); }
const token = getParam('token');
let inviteDoc;

async function loadInvite(){
  if(!token){ inviteInfo.textContent='Invitación inválida.'; return; }
  const doc=await db.collection('invites').doc(token).get();
  if(!doc.exists){ inviteInfo.textContent='Invitación no encontrada.'; return; }
  const inv=doc.data(); inviteDoc=doc;
  if(inv.status!=='pending'||Date.now()>inv.expiresAt){ inviteInfo.textContent='Invitación expirada o usada.'; return; }
  inviteInfo.innerHTML=`Vas a crear una cuenta para <b>${inv.email}</b> (rol: ${inv.role}).`;
  form.email.value=inv.email; form.name.value=inv.name||''; form.hidden=false;
}

form?.addEventListener('submit',async(e)=>{
  e.preventDefault();
  const name=e.target.name.value.trim();
  const email=e.target.email.value.trim().toLowerCase();
  const pass=e.target.password.value;
  const {user}=await auth.createUserWithEmailAndPassword(email,pass);
  await user.updateProfile({displayName:name});
  await db.collection('users').doc(user.uid).set({
    uid:user.uid,name,email,
    role:inviteDoc.data().role||'member',
    status:'blocked',
    createdAt:Date.now(),lastLoginAt:Date.now()
  });
  await db.collection('invites').doc(token).update({status:'used',usedAt:Date.now(),usedBy:user.uid});
  alert('Cuenta creada. Esperá activación de un administrador.');
  location.href='../../index.html';
});

loadInvite();
