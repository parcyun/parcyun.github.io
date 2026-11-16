import {OAuth2Client} from 'google-auth-library';

export const inbox='pen.layered@gmail.com';

export function makeMessage({email,subject,message,id}){
 const subjectWords=Array.from(`[parcyun studio] ${subject}`).join('').match(/.{1,16}/gu).map(word=>`=?UTF-8?B?${Buffer.from(word).toString('base64')}?=`).join('\r\n ');
 const text=`사이트 협업 문의\n답장 주소(작성자 입력, 미인증): ${email}\n문의 번호: ${id}\n\n${message}`;
 return [
  `From: parcyun studio <${inbox}>`,`To: ${inbox}`,`Reply-To: ${email}`,
  `Subject: ${subjectWords}`,`Message-ID: <${id}@contact.parcyun.github.io>`,
  'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',
  Buffer.from(text).toString('base64').match(/.{1,76}/g).join('\r\n')
 ].join('\r\n');
}

export function gmailSender(credentials){
 const client=new OAuth2Client(credentials.client_id,credentials.client_secret);
 client.setCredentials({refresh_token:credentials.refresh_token});
 return async(data)=>{
  const {token}=await client.getAccessToken();
  if(!token)throw Error('Mail authorization unavailable');
  // A send is never automatically retried: an uncertain result may already be delivered.
  const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{
   method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
   body:JSON.stringify({raw:Buffer.from(makeMessage(data)).toString('base64url')}),signal:AbortSignal.timeout(12000)
  });
  const result=await response.json();
  if(!response.ok||!result.id)throw Error('Mail provider did not confirm send');
  return result.id;
 };
}
