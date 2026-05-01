import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { PaymentsService } from "../../core/api/services/payments.service";
import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";
import { OWNER_SCREENS } from "../../navigation/owner.routes";

const onlyDigits = (v?: string) => String(v || "").replace(/\D/g, "");
const makeNonce = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

function buildHtml(publicKey: string, amount: number, nonce: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
  <style>body{font-family:sans-serif;padding:8px} .f{border:1px solid #ddd;border-radius:8px;padding:10px;margin-bottom:8px;height:22px}</style></head>
  <body><form id="form-checkout"><div id="form-checkout__cardNumber" class="f"></div><div id="form-checkout__expirationDate" class="f"></div><div id="form-checkout__securityCode" class="f"></div></form>
  <script>(function(){
    var NONCE=${JSON.stringify(nonce)}; var AMOUNT=${JSON.stringify(String(amount||0))};
    function post(type,p){ window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({type:type,nonce:NONCE},p||{}))); }
    var mp = new MercadoPago(${JSON.stringify(publicKey)});
    var state={paymentMethodId:null,issuerId:null,installments:[]};
    var cardForm = mp.cardForm({ amount: AMOUNT, iframe: true, form: {
      id:'form-checkout', cardNumber:{id:'form-checkout__cardNumber'}, expirationDate:{id:'form-checkout__expirationDate'}, securityCode:{id:'form-checkout__securityCode'}
    }, callbacks: {
      onFormMounted: function(err){ if(err) return post('MP_ERROR',{errorCode:'FORM_MOUNT_FAIL'}); post('MP_READY',{}); },
      onBinChange: async function(bin){ try { if(!bin||bin.length<6) return; const pms=await mp.getPaymentMethods({bin:bin}); const pm=(pms&&pms.results&&pms.results[0])||null; const pmId=pm&&pm.id?pm.id:null; state.paymentMethodId=pmId;
        let iss=null; if(pmId){ const issuers=await mp.getIssuers({paymentMethodId:pmId, bin:bin}); iss=issuers&&issuers[0]&&issuers[0].id?String(issuers[0].id):null; } state.issuerId=iss;
        if(Number(AMOUNT)>0){ const inst=await mp.getInstallments({amount:AMOUNT,bin:bin,paymentTypeId:'credit_card'}); const payer=(inst&&inst[0]&&inst[0].payer_costs)?inst[0].payer_costs:[]; state.installments=payer.map(function(x){return x.installments;}); }
        post('MP_LOOKUPS_RESULT',{paymentMethodId:state.paymentMethodId,issuerId:state.issuerId,installments:state.installments});
      } catch(e){ post('MP_ERROR',{errorCode:'LOOKUP_FAIL'});} }
    }});
    async function onMessage(ev){ try{ var m=JSON.parse(ev.data||'{}'); if(m.type!=='MP_SUBMIT' || m.nonce!==NONCE) return;
      const token = await cardForm.createCardToken({ cardholderName:m.cardholderName, identificationType:m.docType, identificationNumber:m.docNumber });
      post('MP_TOKEN_RESULT',{ok:true,cardToken:token&&token.id?token.id:null,paymentMethodId:state.paymentMethodId,issuerId:state.issuerId,installments:state.installments});
    } catch(e){ post('MP_TOKEN_RESULT',{ok:false,errorCode:'TOKENIZE_FAIL'});} }
    window.addEventListener('message',onMessage); document.addEventListener('message',onMessage);
  })();</script></body></html>`;
}

export function MercadoPagoCardEntryScreen({ navigation, route }: any) {
  const orderId = String(route?.params?.orderId || "");
  const routePublicKey = route?.params?.publicKey;
  const routeAmount = Number(route?.params?.amount || 0);
  const nonce = useMemo(() => makeNonce(), []);
  const [publicKey, setPublicKey] = useState<string | null>(routePublicKey ?? null);
  const [amount, setAmount] = useState<number>(routeAmount);
  const [name, setName] = useState("");
  const [doc, setDoc] = useState("");
  const [email, setEmail] = useState("");
  const [installments, setInstallments] = useState(1);
  const [maxInstallments, setMaxInstallments] = useState(1);
  const [availableInstallments, setAvailableInstallments] = useState<number[]>([1]);
  const [pmId, setPmId] = useState<string | undefined>();
  const [issuerId, setIssuerId] = useState<string | undefined>();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const webRef = useRef<WebView>(null);

  useEffect(() => { (async () => {
    const methods = await PaymentsService.getPaymentMethods();
    if (methods.card.provider !== "MERCADOPAGO" || !methods.card.publicKey) throw new Error("Mercado Pago indisponível.");
    if (!publicKey) setPublicKey(methods.card.publicKey);
    setMaxInstallments(Number(methods.card.maxInstallments || 1));
    if (!(amount > 0)) {
      const active = await PaymentsService.active(orderId);
      const fallback = Number((active as any)?.payment?.amount || (active as any)?.order?.amountDue || (active as any)?.order?.totalAmount || (active as any)?.amount || 0);
      if (fallback > 0) setAmount(fallback);
      else setError("Não foi possível carregar o valor do pedido.");
    }
  })().catch(() => setError("Não foi possível iniciar pagamento.")); }, []);

  const html = useMemo(() => (publicKey && amount > 0 ? buildHtml(publicKey, amount, nonce) : ""), [publicKey, amount, nonce]);

  const onMessage = (ev: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(ev.nativeEvent.data || "{}");
      if (msg?.nonce !== nonce) return;
      if (msg.type === "MP_READY") setReady(true);
      if (msg.type === "MP_ERROR") setError("Falha no formulário seguro de cartão.");
      if (msg.type === "MP_LOOKUPS_RESULT") {
        if (msg.paymentMethodId) setPmId(String(msg.paymentMethodId));
        if (msg.issuerId) setIssuerId(String(msg.issuerId));
        const raw = Array.isArray(msg.installments) ? msg.installments : [];
        const normalized: number[] = Array.from(new Set(raw.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n >= 1) as number[])).sort((a: number, b: number) => a - b);
        const filtered = normalized.filter((n) => n <= maxInstallments);
        const next = filtered.length ? filtered : [1];
        setAvailableInstallments(next);
        if (!next.includes(installments)) setInstallments(next[0]);
      }
      if (msg.type === "MP_TOKEN_RESULT") (webRef.current as any).__tokenResult = msg;
    } catch { setError("Resposta inválida da tokenização."); }
  };

  async function onPay() {
    if (!ready || processing) return;
    setProcessing(true); setError(null);
    try {
      if (!orderId) throw new Error("Pedido inválido.");
      if (!(amount > 0)) throw new Error("Não foi possível carregar o valor do pedido.");
      if (onlyDigits(doc).length < 11 || !email.includes("@") || !name.trim()) throw new Error("Preencha os dados do pagador.");
      (webRef.current as any).__tokenResult = null;
      webRef.current?.postMessage(JSON.stringify({ type: "MP_SUBMIT", nonce, cardholderName: name.trim(), docType: onlyDigits(doc).length === 14 ? "CNPJ" : "CPF", docNumber: onlyDigits(doc) }));
      const start = Date.now();
      while (!(webRef.current as any).__tokenResult) {
        if (Date.now() - start > 20000) throw new Error("Tempo esgotado ao tokenizar cartão.");
        await new Promise<void>((r) => setTimeout(() => r(), 200));
      }
      const tokenMsg = (webRef.current as any).__tokenResult;
      const cardToken = tokenMsg?.cardToken;
      const paymentMethodId = tokenMsg?.paymentMethodId || pmId;
      if (!cardToken) throw new Error("Token de cartão ausente.");
      if (!paymentMethodId) throw new Error("Método de pagamento do cartão não identificado.");
      const payer = { cpf: onlyDigits(doc), firstName: name.trim(), lastName: "-", email: email.trim(), address: { zipCode: "", streetName: "", streetNumber: "", neighborhood: "", city: "", federalUnit: "" } };
      await PaymentsService.intentCARD(orderId, { installments, payer, card: { cardToken, paymentMethodId, issuerId: tokenMsg?.issuerId || issuerId } });
      setStatus("Pagamento em processamento...");
      for (let i=0;i<20;i++){ await new Promise<void>((r)=>setTimeout(()=>r(),3000)); const a=await PaymentsService.active(orderId); const st=String((a as any)?.payment?.status||"").toUpperCase();
        if (st==="PAID") { navigation.replace(String(route?.name).includes("Owner") ? OWNER_SCREENS.OrderDetails : CUSTOMER_SCREENS.OrderDetails, { orderId }); return; }
        if (st==="FAILED"||st==="CANCELED") { setStatus("Pagamento falhou. Tente novamente."); return; }
      }
    } catch(e:any){ setError(e?.message || "Erro ao pagar com Mercado Pago."); }
    finally { setProcessing(false); }
  }

  return <Screen><Container style={{ flex:1, gap:8 }}>
    <Text style={s.title}>Cartão Mercado Pago</Text>{!!error && <Text style={s.error}>{error}</Text>}{!!status && <Text>{status}</Text>}
    <TextInput placeholder="Nome no cartão" value={name} onChangeText={setName} style={s.input} />
    <TextInput placeholder="CPF/CNPJ" keyboardType="number-pad" value={doc} onChangeText={(v)=>setDoc(onlyDigits(v).slice(0,14))} style={s.input} />
    <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={s.input} />
    <View style={{ flexDirection:"row", gap:8, flexWrap:"wrap" }}>{availableInstallments.map((n)=><Pressable key={n} onPress={()=>setInstallments(n)} style={[s.inst,installments===n&&s.instOn]}><Text>{n}x</Text></Pressable>)}</View>
    {!!html && <WebView ref={webRef} source={{ html }} onMessage={onMessage} javaScriptEnabled domStorageEnabled={false} incognito setSupportMultipleWindows={false} javaScriptCanOpenWindowsAutomatically={false} mixedContentMode="never" allowFileAccess={false} onShouldStartLoadWithRequest={(req)=> {
      try {
        const host = String(req.url || "").replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
        if (req.url.startsWith("about:blank")) return true;
        if (host === "sdk.mercadopago.com") return true;
        if (host.endsWith(".mercadopago.com") || host === "mercadopago.com") return true;
        if (host.endsWith(".mercadolibre.com") || host === "mercadolibre.com") return true;
        return false;
      } catch {
        return req.url.startsWith("about:blank");
      }
    }} />}
    <Pressable onPress={onPay} disabled={processing||!ready} style={s.btn}>{processing ? <ActivityIndicator color="#fff"/> : <Text style={{ color:"#fff", fontWeight:"700" }}>Pagar</Text>}</Pressable>
  </Container></Screen>;
}
const s = StyleSheet.create({ title:{ fontSize:20, fontWeight:"800" }, error:{ color:"#b00020" }, input:{ borderWidth:1,borderColor:"#ddd",borderRadius:10,padding:10 }, btn:{ backgroundColor:"#111", padding:12,borderRadius:10,alignItems:"center" }, inst:{ borderWidth:1,borderColor:"#ddd",borderRadius:8,paddingHorizontal:10,paddingVertical:6 }, instOn:{ borderColor:"#111" } });