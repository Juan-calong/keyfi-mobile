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
  <style>
    html,body{margin:0;padding:0;background:#fff;font-family:sans-serif}
    body{padding:8px}
    .field-wrap{margin-bottom:10px}
    .label{font-size:13px;color:#333;margin-bottom:4px;font-weight:600}
    .f{border:1px solid #ddd;border-radius:8px;min-height:48px;height:48px;width:100%;background:#fff;box-sizing:border-box;overflow:hidden;position:relative}
    .f iframe{width:100% !important;height:100% !important;border:0 !important;display:block !important}
  </style></head>
  <body><form id="form-checkout" onsubmit="return false;">
    <div class="field-wrap"><div class="label">Número do cartão</div><div id="form-checkout__cardNumber" class="f"></div></div>
    <div class="field-wrap"><div class="label">Validade</div><div id="form-checkout__expirationDate" class="f"></div></div>
    <div class="field-wrap"><div class="label">CVV/CVC</div><div id="form-checkout__securityCode" class="f"></div></div>
  </form>
  <script>(function(){
    var NONCE=${JSON.stringify(nonce)};
    var AMOUNT=${JSON.stringify(String(amount || 0))};
    var mp=null;
    var fields={cardNumber:null,expirationDate:null,securityCode:null};
    var state={paymentMethodId:null,issuerId:null,installments:[]};

    function post(type,p){
      window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({type:type,nonce:NONCE},p||{})));
    }

    function inspectFields(){
      var card=document.querySelector('#form-checkout__cardNumber iframe');
      var exp=document.querySelector('#form-checkout__expirationDate iframe');
      var cvv=document.querySelector('#form-checkout__securityCode iframe');
      post('MP_FIELDS_INSPECT',{
        hasCardIframe:!!card,
        hasExpirationIframe:!!exp,
        hasSecurityIframe:!!cvv,
        iframeCount:document.querySelectorAll('iframe').length
      });
    }

    function normalizeInstallments(inst){
      var payer=(inst&&inst[0]&&inst[0].payer_costs)?inst[0].payer_costs:[];
      state.installments=payer.map(function(x){return x.installments;});
    }

    async function resolveCardMetadata(bin){
      try{
        post('MP_BIN_CHANGE',{hasBin:Boolean(bin),binLength:bin?String(bin).length:0});
        if(!bin||String(bin).length<6) return;

        var pms=await mp.getPaymentMethods({bin:bin});
        var pm=(pms&&pms.results&&pms.results[0])||null;
        var pmId=pm&&pm.id?pm.id:null;
        state.paymentMethodId=pmId;

        var iss=null;
        if(pmId){
          var issuers=await mp.getIssuers({paymentMethodId:pmId,bin:bin});
          iss=issuers&&issuers[0]&&issuers[0].id?String(issuers[0].id):null;
        }
        state.issuerId=iss;

        if(Number(AMOUNT)>0){
          var inst=await mp.getInstallments({amount:AMOUNT,bin:bin,paymentTypeId:'credit_card'});
          normalizeInstallments(inst);
        }

        post('MP_LOOKUPS_RESULT',{paymentMethodId:state.paymentMethodId,issuerId:state.issuerId,installments:state.installments});
      } catch(e){
        post('MP_ERROR',{errorCode:'LOOKUP_FAIL'});
      }
    }

    function mountSecureFields(){
      if(!window.MercadoPago){
        post('MP_ERROR',{errorCode:'MP_SDK_NOT_LOADED'});
        return;
      }

      try{
        mp=new MercadoPago(${JSON.stringify(publicKey)});
        if(!mp.fields||typeof mp.fields.create!=='function'||typeof mp.fields.createCardToken!=='function'){
          post('MP_ERROR',{errorCode:'MP_FIELDS_UNAVAILABLE'});
          return;
        }

        fields.cardNumber=mp.fields.create('cardNumber',{placeholder:'0000 0000 0000 0000'}).mount('form-checkout__cardNumber');
        fields.expirationDate=mp.fields.create('expirationDate',{placeholder:'MM/AA'}).mount('form-checkout__expirationDate');
        fields.securityCode=mp.fields.create('securityCode',{placeholder:'CVV'}).mount('form-checkout__securityCode');

        if(fields.cardNumber&&typeof fields.cardNumber.on==='function'){
          fields.cardNumber.on('binChange',function(data){
            resolveCardMetadata(data&&data.bin?String(data.bin):'');
          });
        }

        post('MP_READY',{});
        inspectFields();
        setTimeout(inspectFields,500);
        setTimeout(inspectFields,1500);
        setTimeout(inspectFields,3000);
      } catch(e){
        post('MP_ERROR',{errorCode:'FIELDS_MOUNT_FAIL'});
        inspectFields();
      }
    }

    async function onMessage(ev){
      try{
        var m=JSON.parse(ev.data||'{}');
        if(m.type!=='MP_SUBMIT'||m.nonce!==NONCE) return;
        if(!mp||!mp.fields||typeof mp.fields.createCardToken!=='function'){
          post('MP_TOKEN_RESULT',{ok:false,errorCode:'MP_FIELDS_NOT_READY'});
          return;
        }
        var token=await mp.fields.createCardToken({
          cardholderName:m.cardholderName,
          identificationType:m.docType,
          identificationNumber:m.docNumber
        });
        post('MP_TOKEN_RESULT',{
          ok:true,
          cardToken:token&&token.id?token.id:null,
          paymentMethodId:state.paymentMethodId,
          issuerId:state.issuerId,
          installments:state.installments
        });
      } catch(e){
        post('MP_TOKEN_RESULT',{ok:false,errorCode:'TOKENIZE_FAIL'});
      }
    }

    window.addEventListener('message',onMessage);
    document.addEventListener('message',onMessage);

    if(document.readyState==='complete'||document.readyState==='interactive'){
      setTimeout(mountSecureFields,0);
    } else {
      document.addEventListener('DOMContentLoaded',mountSecureFields);
    }
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
  const [provider, setProvider] = useState<string | null>(null);
  const [webLoaded, setWebLoaded] = useState(false);
  const [fieldsMounted, setFieldsMounted] = useState(false);
  const webRef = useRef<WebView>(null);

  useEffect(() => { (async () => {
    const methods = await PaymentsService.getPaymentMethods();
    const cardProvider = String(methods?.card?.provider || "").trim().toUpperCase();
    setProvider(cardProvider);
    if (cardProvider !== "MERCADOPAGO" || !methods?.card?.publicKey) throw new Error("Mercado Pago indisponível.");
    if (!publicKey) setPublicKey(methods.card.publicKey);
    setMaxInstallments(Number(methods.card.maxInstallments || 1));
    if (!(amount > 0)) {
      const active = await PaymentsService.active(orderId);
      const fallback = Number((active as any)?.payment?.amount || (active as any)?.order?.amountDue || (active as any)?.order?.totalAmount || (active as any)?.amount || 0);
      if (fallback > 0) setAmount(fallback);
      else setError("Não foi possível identificar o valor do pedido. Volte e tente novamente.");
      console.log("[MP_CARD][INIT_AMOUNT]", {
        orderId,
        routeAmount,
        amount: fallback > 0 ? fallback : amount,
        hasAmount: (fallback > 0 ? fallback : amount) > 0,
      });
      return;
    }
    console.log("[MP_CARD][INIT_AMOUNT]", { orderId, routeAmount, amount, hasAmount: amount > 0 });
  })().catch(() => setError("Não foi possível iniciar pagamento.")); }, [amount, orderId, publicKey, routeAmount]);

  const html = useMemo(() => (publicKey && amount > 0 ? buildHtml(publicKey, amount, nonce) : ""), [publicKey, amount, nonce]);

    const canPay = Boolean(publicKey) && amount > 0 && fieldsMounted && provider === "MERCADOPAGO" && !processing;

  useEffect(() => {
    console.log("[MP_CARD][CAN_PAY_STATE]", {
      hasPublicKey: Boolean(publicKey),
      amount,
      hasAmount: amount > 0,
      ready,
      provider,
      isMercadoPago: provider === "MERCADOPAGO",
      processing,
      fieldsMounted,
      canPay,
    });
  }, [publicKey, amount, ready, provider, processing, canPay, fieldsMounted]);

  useEffect(() => {
    if (!fieldsMounted && webLoaded && Boolean(publicKey) && amount > 0 && provider === "MERCADOPAGO") {
      const t = setTimeout(() => {
        setError((prev) => prev || "Não foi possível carregar o formulário seguro do cartão. Tente novamente.");
      }, 5000);
      return () => clearTimeout(t);
    }
    return;
  }, [fieldsMounted, webLoaded, publicKey, amount, provider]);

  const onMessage = (ev: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(ev.nativeEvent.data || "{}");
        console.log("[MP_CARD][WEBVIEW_MSG]", {
        type: msg?.type,
        hasNonce: Boolean(msg?.nonce),
        nonceOk: msg?.nonce === nonce,
        hasPaymentMethodId: Boolean(msg?.paymentMethodId),
        hasIssuerId: Boolean(msg?.issuerId),
        hasInstallments: Array.isArray(msg?.installments),
        ok: msg?.ok,
        errorCode: msg?.errorCode,
      });
      if (msg?.nonce !== nonce) return;
      if (msg.type === "MP_READY") setReady(true);
      if (msg.type === "MP_FIELDS_INSPECT") {
        const hasCardIframe = Boolean(msg?.hasCardIframe);
        const hasExpirationIframe = Boolean(msg?.hasExpirationIframe);
        const hasSecurityIframe = Boolean(msg?.hasSecurityIframe);
        console.log("[MP_CARD][FIELDS_INSPECT]", {
          hasCardIframe,
          hasExpirationIframe,
          hasSecurityIframe,
          iframeCount: Number(msg?.iframeCount || 0),
        });
        if (hasCardIframe && hasExpirationIframe && hasSecurityIframe) setFieldsMounted(true);
      }
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
    if (!fieldsMounted || processing) return;
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

const docDigits = onlyDigits(doc);
const docType = docDigits.length === 14 ? "CNPJ" : "CPF";

const nameParts = name.trim().split(/\s+/).filter(Boolean);
const firstName = nameParts[0] || name.trim();
const lastName = nameParts.slice(1).join(" ") || firstName || "-";

const payer = {
  email: email.trim(),

  cpf: docDigits,
  doc: docDigits,
  document: docDigits,
  docDigits,
  docType,

  identification: {
    type: docType,
    number: docDigits,
  },

  firstName,
  lastName,
  name: name.trim(),

  address: {
    zipCode: "",
    streetName: "",
    streetNumber: "",
    neighborhood: "",
    city: "",
    federalUnit: "",
  },
};

await PaymentsService.intentCARD(orderId, {
  installments,
  payer,
  card: {
    cardToken,
    paymentMethodId,
    issuerId: tokenMsg?.issuerId || issuerId,
  },
});
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
    {!!html && <WebView ref={webRef} source={{ html }} onMessage={onMessage} javaScriptEnabled domStorageEnabled incognito={false} setSupportMultipleWindows={false} javaScriptCanOpenWindowsAutomatically={false} mixedContentMode="never" allowFileAccess={false} style={{ minHeight: 280, backgroundColor: "#fff" }} onLoadEnd={() => setWebLoaded(true)} onShouldStartLoadWithRequest={(req)=> {
      try {
        const host = String(req.url || "").replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
        if (req.url.startsWith("about:blank")) return true;
        if (host === "sdk.mercadopago.com") return true;
        if (host.endsWith(".mercadopago.com") || host === "mercadopago.com") return true;
        if (host.endsWith(".mercadolibre.com") || host === "mercadolibre.com") return true;
        if (host.endsWith(".mercadopago.com.br") || host === "mercadopago.com.br") return true;
        if (host.endsWith(".mercadolibrestatic.com") || host === "mercadolibrestatic.com") return true;
        if (host.endsWith(".mlstatic.com") || host === "mlstatic.com") return true;
        console.log("[MP_CARD][WEBVIEW_BLOCKED_HOST]", { host });
        return false;
      } catch {
        return req.url.startsWith("about:blank");
      }
    }} />}
        {__DEV__ && (
      <Text style={{ fontSize: 11, opacity: 0.5 }}>
ready={String(ready)} fieldsMounted={String(fieldsMounted)} provider={String(provider)} amount={String(amount)} canPay={String(canPay)}
      </Text>
    )}
    <Pressable onPress={onPay} disabled={!canPay} style={[s.btn, !canPay && { opacity: 0.5 }]}>{processing ? <ActivityIndicator color="#fff"/> : <Text style={{ color:"#fff", fontWeight:"700" }}>Pagar</Text>}</Pressable>
  </Container></Screen>;
}
const s = StyleSheet.create({ title:{ fontSize:20, fontWeight:"800" }, error:{ color:"#b00020" }, input:{ borderWidth:1,borderColor:"#ddd",borderRadius:10,padding:10 }, btn:{ backgroundColor:"#111", padding:12,borderRadius:10,alignItems:"center" }, inst:{ borderWidth:1,borderColor:"#ddd",borderRadius:8,paddingHorizontal:10,paddingVertical:6 }, instOn:{ borderColor:"#111" } });