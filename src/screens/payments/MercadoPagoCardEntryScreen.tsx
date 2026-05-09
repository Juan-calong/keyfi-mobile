import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { Screen } from "../../ui/components/Screen";
import { PaymentsService } from "../../core/api/services/payments.service";
import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";
import { OWNER_SCREENS } from "../../navigation/owner.routes";

const onlyDigits = (v?: string) => String(v || "").replace(/\D/g, "");
const makeNonce = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

function buildHtml(publicKey: string, amount: number, nonce: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
  <script src="https://www.mercadopago.com/v2/security.js" view="checkout"></script>
  <style>
    html,body{margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
    body{padding:8px}
    .field-wrap{margin-bottom:12px}
    .row{display:flex;gap:12px;}
    .col{flex:1;}
    .label{font-size:14px;color:#111;margin-bottom:6px;font-weight:700}
    .f{border:1px solid #ddd;border-radius:10px;min-height:52px;height:52px;width:100%;background:#fff;box-sizing:border-box;overflow:hidden;position:relative}
    .f iframe{width:100% !important;height:100% !important;border:0 !important;display:block !important;padding:0 8px !important;box-sizing:border-box}
  </style></head>
  <body><form id="form-checkout" onsubmit="return false;">
    <div class="field-wrap">
      <div class="label">Número do cartão</div>
      <div id="form-checkout__cardNumber" class="f"></div>
    </div>
    <div class="row">
      <div class="field-wrap col">
        <div class="label">Validade</div>
        <div id="form-checkout__expirationDate" class="f"></div>
      </div>
      <div class="field-wrap col">
        <div class="label">CVV/CVC</div>
        <div id="form-checkout__securityCode" class="f"></div>
      </div>
    </div>
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

        post('MP_LOOKUPS_RESULT',{
          paymentMethodId:state.paymentMethodId,
          issuerId:state.issuerId,
          installments:state.installments
        });
      } catch(e){
        post('MP_ERROR',{errorCode:'LOOKUP_FAIL'});
      }
    }

    function readDeviceSessionId(){
      var hidden=document.getElementById('deviceId');
      var candidates=[
        window.MP_DEVICE_SESSION_ID,
        window.deviceId,
        hidden&&hidden.value?hidden.value:null
      ];
      for(var i=0;i<candidates.length;i++){
        var value=typeof candidates[i]==='string'?candidates[i].trim():'';
        if(value) return value;
      }
      return null;
    }

    function postDeviceSession(){
      var deviceSessionId=readDeviceSessionId();
      post('MP_DEVICE_SESSION',{
        deviceSessionId:deviceSessionId,
        hasDeviceSessionId:Boolean(deviceSessionId)
      });
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
        postDeviceSession();
        inspectFields();

        setTimeout(function(){ inspectFields(); postDeviceSession(); },500);
        setTimeout(function(){ inspectFields(); postDeviceSession(); },1500);
        setTimeout(function(){ inspectFields(); postDeviceSession(); },3000);
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
          postDeviceSession();
          post('MP_TOKEN_RESULT',{ok:false,errorCode:'MP_FIELDS_NOT_READY'});
          return;
        }

        postDeviceSession();

        var token=await mp.fields.createCardToken({
          cardholderName:m.cardholderName,
          identificationType:m.docType,
          identificationNumber:m.docNumber
        });

        postDeviceSession();

        post('MP_TOKEN_RESULT',{
          ok:true,
          cardToken:token&&token.id?token.id:null,
          paymentMethodId:state.paymentMethodId,
          issuerId:state.issuerId,
          installments:state.installments
        });
      } catch(e){
        postDeviceSession();
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
  const [installmentsExpanded, setInstallmentsExpanded] = useState(false);

  const [pmId, setPmId] = useState<string | undefined>();
  const [issuerId, setIssuerId] = useState<string | undefined>();
  const [deviceSessionId, setDeviceSessionId] = useState<string | undefined>();

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusTitle, setStatusTitle] = useState<string | null>(null);
  const [showOrderAction, setShowOrderAction] = useState(false);
  const [paymentAttemptLocked, setPaymentAttemptLocked] = useState(false);

  const [ready, setReady] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [webLoaded, setWebLoaded] = useState(false);
  const [fieldsMounted, setFieldsMounted] = useState(false);

  const webRef = useRef<WebView>(null);

  const orderDetailsRoute = String(route?.name).includes("Owner")
    ? OWNER_SCREENS.OrderDetails
    : CUSTOMER_SCREENS.OrderDetails;

  const goToOrderDetails = () =>
    navigation.replace(orderDetailsRoute, {
      orderId,
      showPaymentSuccessOnPaid: true,
    });

  const formattedAmount = amount > 0 
    ? amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";

  useEffect(() => {
    (async () => {
      const methods = await PaymentsService.getPaymentMethods();
      const cardProvider = String(methods?.card?.provider || "").trim().toUpperCase();

      setProvider(cardProvider);

      if (cardProvider !== "MERCADOPAGO" || !methods?.card?.publicKey) {
        throw new Error("Mercado Pago indisponível.");
      }

      if (!publicKey) {
        setPublicKey(methods.card.publicKey);
      }

      setMaxInstallments(Number(methods.card.maxInstallments || 1));

      if (!(amount > 0)) {
        const active = await PaymentsService.active(orderId);

        const fallback = Number(
          (active as any)?.payment?.amount ||
            (active as any)?.order?.amountDue ||
            (active as any)?.order?.totalAmount ||
            (active as any)?.amount ||
            0
        );

        if (fallback > 0) {
          setAmount(fallback);
        } else {
          setError("Não foi possível identificar o valor do pedido. Volte e tente novamente.");
        }
      }
    })().catch(() => setError("Não foi possível iniciar pagamento."));
  }, [amount, orderId, publicKey]);

  const html = useMemo(
    () => (publicKey && amount > 0 ? buildHtml(publicKey, amount, nonce) : ""),
    [publicKey, amount, nonce]
  );

  const canPay =
    Boolean(publicKey) &&
    amount > 0 &&
    fieldsMounted &&
    provider === "MERCADOPAGO" &&
    !processing &&
    !paymentAttemptLocked;

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

      if (msg?.nonce !== nonce) return;

      if (msg.type === "MP_READY") {
        setReady(true);
      }

      if (msg.type === "MP_FIELDS_INSPECT") {
        const hasCardIframe = Boolean(msg?.hasCardIframe);
        const hasExpirationIframe = Boolean(msg?.hasExpirationIframe);
        const hasSecurityIframe = Boolean(msg?.hasSecurityIframe);

        if (hasCardIframe && hasExpirationIframe && hasSecurityIframe) {
          setFieldsMounted(true);
        }
      }

      if (msg.type === "MP_ERROR") {
        setError("Falha no formulário seguro de cartão.");
      }

      if (msg.type === "MP_LOOKUPS_RESULT") {
        if (msg.paymentMethodId) {
          setPmId(String(msg.paymentMethodId));
        }

        if (msg.issuerId) {
          setIssuerId(String(msg.issuerId));
        }

        const raw = Array.isArray(msg.installments) ? msg.installments : [];

        const normalized: number[] = Array.from(
          new Set(
            raw
              .map((n: any) => Number(n))
              .filter((n: number) => Number.isFinite(n) && n >= 1) as number[]
          )
        ).sort((a: number, b: number) => a - b);

        const filtered = normalized.filter((n) => n <= maxInstallments);
        const next = filtered.length ? filtered : [1];

        setAvailableInstallments(next);

        if (!next.includes(installments)) {
          setInstallments(next[0]);
        }
      }

      if (msg.type === "MP_DEVICE_SESSION") {
        const nextDeviceSessionId =
          typeof msg?.deviceSessionId === "string" && msg.deviceSessionId.trim()
            ? msg.deviceSessionId.trim()
            : undefined;

        setDeviceSessionId(nextDeviceSessionId);
      }

      if (msg.type === "MP_TOKEN_RESULT") {
        (webRef.current as any).__tokenResult = msg;
      }
    } catch {
      setError("Resposta inválida da tokenização.");
    }
  };

  async function onPay() {
    if (!fieldsMounted || processing) return;

    setProcessing(true);
    setPaymentAttemptLocked(false);
    setShowOrderAction(false);
    setError(null);
    setStatusTitle("Pagamento em processamento...");
    setStatus("Pagamento em processamento...");

    try {
      if (!orderId) {
        throw new Error("Pedido inválido.");
      }

      if (!(amount > 0)) {
        throw new Error("Não foi possível carregar o valor do pedido.");
      }

      const cardholderName = name.trim();
      const emailValue = email.trim().toLowerCase();
      const docDigits = onlyDigits(doc);

      const isCpf = docDigits.length === 11;
      const isCnpj = docDigits.length === 14;
      const docType = isCnpj ? "CNPJ" : "CPF";

      const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

      if (!cardholderName) {
        throw new Error("Informe o nome do titular do cartão.");
      }

      if (!isCpf && !isCnpj) {
        throw new Error("Informe um CPF ou CNPJ válido.");
      }

      if (!isEmailValid) {
        throw new Error("Informe um email válido.");
      }

      (webRef.current as any).__tokenResult = null;

      webRef.current?.postMessage(
        JSON.stringify({
          type: "MP_SUBMIT",
          nonce,
          cardholderName,
          docType,
          docNumber: docDigits,
        })
      );

      const start = Date.now();

      while (!(webRef.current as any).__tokenResult) {
        if (Date.now() - start > 20000) {
          throw new Error("Tempo esgotado ao tokenizar cartão.");
        }

        await new Promise<void>((r) => setTimeout(() => r(), 200));
      }

      const tokenMsg = (webRef.current as any).__tokenResult;

      if (tokenMsg?.ok === false) {
        throw new Error("Não foi possível tokenizar o cartão. Verifique os dados e tente novamente.");
      }

      const cardToken = tokenMsg?.cardToken;
      const paymentMethodId = tokenMsg?.paymentMethodId || pmId;

      if (!cardToken) {
        throw new Error("Token de cartão ausente.");
      }

      if (!paymentMethodId) {
        throw new Error("Método de pagamento do cartão não identificado.");
      }

      const nameParts = cardholderName.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || cardholderName;
      const lastName = nameParts.slice(1).join(" ") || firstName || "-";

      const payer = {
        email: emailValue,

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
        name: cardholderName,

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
          deviceSessionId,
        },
      });

      for (let i = 0; i < 20; i++) {
        await new Promise<void>((r) => setTimeout(() => r(), 3000));

        const a = await PaymentsService.active(orderId);
        const payment = (a as any)?.payment || {};
        const nextAction = (a as any)?.nextAction || {};
        const ui = (a as any)?.ui || {};
        const flags = (a as any)?.flags || {};
        const st = String(payment?.status || "").toUpperCase();

        if (st === "PAID") {
          goToOrderDetails();
          return;
        }

        if (["FAILED", "CANCELED", "REJECTED", "DECLINED"].includes(st)) {
          setStatusTitle("Pagamento recusado");
          setStatus(ui?.message || "Pagamento recusado. Tente outro cartão ou outra forma de pagamento.");

          if (flags?.canRetry === false) {
            setPaymentAttemptLocked(true);
            setShowOrderAction(true);
          } else {
            setPaymentAttemptLocked(false);
            setShowOrderAction(false);
          }

          return;
        }

        if (
          st === "PENDING" &&
          String(nextAction?.statusDetail || "").toLowerCase() === "pending_review_manual"
        ) {
          setStatusTitle("Pagamento em análise");
          setStatus(
            ui?.message ||
              "Pagamento em análise. O Mercado Pago recebeu sua tentativa e está analisando a transação."
          );
          setPaymentAttemptLocked(true);
          setShowOrderAction(true);
          return;
        }
      }

      setStatusTitle("Pagamento em análise");
      setStatus("Pagamento em análise. Você pode acompanhar o status nos detalhes do pedido.");
      setPaymentAttemptLocked(true);
      setShowOrderAction(true);
    } catch (e: any) {
      setStatusTitle("Erro no pagamento");
      setStatus(null);
      setError(e?.message || "Erro ao pagar com Mercado Pago.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Screen>
      <SafeAreaView style={s.safeArea}>
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backIcon}>‹</Text>
          </Pressable>
          <Text style={s.headerTitle}>Pagamento</Text>
          <View style={s.spacer} /> 
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={s.content}
          >
            {!!error && <Text style={s.error}>{error}</Text>}
            {!!statusTitle && <Text style={s.statusTitle}>{statusTitle}</Text>}
            {!!status && <Text style={s.status}>{status}</Text>}

            <Text style={s.sectionTitle}>Dados do Titular</Text>
            
            <View style={s.fieldGroup}>
              <Text style={s.label}>Nome do titular</Text>
              <TextInput
                placeholder="Ex: João Silva"
                placeholderTextColor="#6B7280"
                value={name}
                onChangeText={setName}
                style={s.input}
                autoCapitalize="words"
                autoCorrect={false}
                underlineColorAndroid="transparent"
                returnKeyType="next"
                autoComplete="name"
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.label}>CPF ou CNPJ</Text>
              <TextInput
                placeholder="Somente números"
                placeholderTextColor="#6B7280"
                keyboardType="number-pad"
                value={doc}
                onChangeText={(v) => setDoc(onlyDigits(v).slice(0, 14))}
                style={s.input}
                maxLength={14}
                underlineColorAndroid="transparent"
                returnKeyType="next"
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.label}>Email</Text>
              <TextInput
                placeholder="email@exemplo.com"
                placeholderTextColor="#6B7280"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                style={s.input}
                underlineColorAndroid="transparent"
                returnKeyType="done"
                autoComplete="email"
              />
            </View>

            <View style={s.divider} />
            
            <Text style={s.sectionTitle}>Dados do Cartão</Text>

            <View style={s.fieldGroup}>
              <Text style={s.label}>Parcelamento</Text>
              <Pressable 
                style={s.dropdownBtn} 
                onPress={() => setInstallmentsExpanded(!installmentsExpanded)}
              >
                <Text style={s.dropdownText}>{installments}x sem juros</Text>
                <Text style={s.dropdownIcon}>{installmentsExpanded ? "▲" : "▼"}</Text>
              </Pressable>

              {installmentsExpanded && (
                <View style={s.dropdownList}>
                  {availableInstallments.map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => {
                        setInstallments(n);
                        setInstallmentsExpanded(false);
                      }}
                      style={[s.dropdownItem, installments === n && s.dropdownItemActive]}
                    >
                      <Text style={[s.dropdownItemText, installments === n && s.dropdownItemTextActive]}>
                        {n}x sem juros
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {!!html && (
              <WebView
                ref={webRef}
                source={{
                  html,
                  baseUrl: "https://www.mercadopago.com.br/",
                }}
                originWhitelist={["*"]}
                onMessage={onMessage}
                javaScriptEnabled
                domStorageEnabled
                incognito={false}
                setSupportMultipleWindows={false}
                javaScriptCanOpenWindowsAutomatically={false}
                mixedContentMode="never"
                allowFileAccess={false}
                style={s.webview}
                onLoadEnd={() => setWebLoaded(true)}
                onShouldStartLoadWithRequest={(req) => {
                  try {
                    const url = String(req.url || "");

                    if (url.startsWith("about:blank")) return true;
                    if (url.startsWith("data:text")) return true;
                    if (url.startsWith("blob:")) return true;

                    if (url === "https://mercadopago.com.br/") return true;
                    if (url === "https://www.mercadopago.com.br/") return true;

                    const host = url
                      .replace(/^https?:\/\//i, "")
                      .split("/")[0]
                      .toLowerCase();

                    if (host === "sdk.mercadopago.com") return true;

                    if (host === "mercadopago.com") return true;
                    if (host.endsWith(".mercadopago.com")) return true;

                    if (host === "mercadopago.com.br") return true;
                    if (host.endsWith(".mercadopago.com.br")) return true;

                    if (host === "mercadolibre.com") return true;
                    if (host.endsWith(".mercadolibre.com")) return true;

                    if (host === "mercadolibrestatic.com") return true;
                    if (host.endsWith(".mercadolibrestatic.com")) return true;

                    if (host === "mlstatic.com") return true;
                    if (host.endsWith(".mlstatic.com")) return true;

                    return false;
                  } catch {
                    return String(req.url || "").startsWith("about:blank");
                  }
                }}
              />
            )}

            <View style={s.securityNoticeContainer}>
              <Text style={s.securityNoticeText}>🔒 Pagamento 100% seguro via Mercado Pago</Text>
            </View>

            <Pressable onPress={onPay} disabled={!canPay} style={[s.btn, !canPay && s.btnDisabled]}>
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>
                  Pagar {formattedAmount ? `R$ ${formattedAmount}` : ""}
                </Text>
              )}
            </Pressable>

            {showOrderAction && (
              <Pressable onPress={goToOrderDetails} style={s.secondaryBtn}>
                <Text style={s.secondaryBtnText}>Ver pedido</Text>
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    padding: 8,
    width: 50,
  },
  backIcon: {
    fontSize: 34,
    color: "#111",
    lineHeight: 34,
    marginTop: -4, 
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  spacer: {
    width: 50,
  },
  content: {
    flexGrow: 1,
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginTop: 8,
    marginBottom: -4,
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 4,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  status: {
    color: "#333",
  },
  error: {
    color: "#b00020",
    fontWeight: "600",
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: "100%",
    minHeight: 52,
    backgroundColor: "#fff",
    color: "#111",
    fontSize: 16,
  },
  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  dropdownText: {
    fontSize: 16,
    color: "#111",
  },
  dropdownIcon: {
    fontSize: 12,
    color: "#666",
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginTop: 4,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dropdownItemActive: {
    backgroundColor: "#f9f9f9",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#444",
  },
  dropdownItemTextActive: {
    color: "#111",
    fontWeight: "700",
  },
  webview: {
    height: 220,
    minHeight: 220,
    backgroundColor: "#fff",
    marginTop: 8,
  },
  securityNoticeContainer: {
    alignItems: "center",
    marginTop: -8,
    marginBottom: 8,
  },
  securityNoticeText: {
    fontSize: 12,
    color: "#15803d",
    fontWeight: "600",
  },
  btn: {
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#111",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#111",
    fontWeight: "700",
  },
});