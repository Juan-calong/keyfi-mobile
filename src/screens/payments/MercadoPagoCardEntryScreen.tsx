import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import type { SavedPaymentCard } from "../../core/api/services/payments.types";
import { PaymentsService } from "../../core/api/services/payments.service";
import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";
import { OWNER_SCREENS } from "../../navigation/owner.routes";
import { Screen } from "../../ui/components/Screen";

type EntryMode = "new_card_payment" | "saved_card_payment" | "add_saved_card";

type TokenResultMessage = {
  ok?: boolean;
  token?: string | null;
  paymentMethodId?: string | null;
  issuerId?: string | null;
  installments?: number[];
  errorCode?: string;
};

type SuccessfulTokenResultMessage = TokenResultMessage & {
  ok: true;
  token: string;
};

const onlyDigits = (v?: string) => String(v || "").replace(/\D/g, "");
const makeNonce = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

function toAmountNumber(value: any) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  const cleaned = raw.replace(/[R$\s]/g, "");
  let normalized = cleaned;

  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".");
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function extractActiveAmount(active: any) {
  return (
    toAmountNumber(active?.payment?.amount) ||
    toAmountNumber(active?.order?.amountDue) ||
    toAmountNumber(active?.order?.totalAmount) ||
    toAmountNumber(active?.amount) ||
    0
  );
}

function buildInstallmentOptions(maxInstallments: number) {
  const max = Math.max(1, Number(maxInstallments || 1));
  return Array.from({ length: max }, (_, index) => index + 1);
}

function getCardLabel(card: SavedPaymentCard) {
  const brand = card.brand || "Cartao";
  const month = String(card.expirationMonth || "").padStart(2, "0");
  const year = String(card.expirationYear || "");
  return `${brand} final ${card.last4} • ${month}/${year.slice(-2)}`;
}

function buildHtml(args: {
  publicKey: string;
  amount: number;
  nonce: string;
  mode: EntryMode;
  savedCard?: SavedPaymentCard | null;
}) {
  const { publicKey, amount, nonce, mode, savedCard } = args;
  const isSavedMode = mode === "saved_card_payment";

  const savedCardId = savedCard?.tokenizationCardId || null;
  const savedPaymentMethodId = savedCard?.paymentMethodId || null;
  const savedIssuerId = savedCard?.issuerId || null;

  const fieldsMarkup = isSavedMode
    ? `
    <div class="field-wrap">
      <div class="label">CVV/CVC</div>
      <div id="form-checkout__securityCode" class="f"></div>
    </div>`
    : `
    <div class="field-wrap">
      <div class="label">Numero do cartao</div>
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
    </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
  <script src="https://www.mercadopago.com/v2/security.js" view="checkout"></script>
  <style>
    html,body{margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
    body{padding:8px}
    .field-wrap{margin-bottom:12px}
    .row{display:flex;gap:12px}
    .col{flex:1}
    .label{font-size:14px;color:#111;margin-bottom:6px;font-weight:700}
    .f{border:1px solid #ddd;border-radius:10px;min-height:52px;height:52px;width:100%;background:#fff;box-sizing:border-box;overflow:hidden;position:relative}
    .f iframe{width:100% !important;height:100% !important;border:0 !important;display:block !important;padding:0 8px !important;box-sizing:border-box}
  </style></head>
  <body><form id="form-checkout" onsubmit="return false;">${fieldsMarkup}</form>
  <script>(function(){
    var NONCE=${JSON.stringify(nonce)};
    var MODE=${JSON.stringify(mode)};
    var AMOUNT=${JSON.stringify(String(amount || 0))};
    var SAVED_CARD_ID=${JSON.stringify(savedCardId)};
    var SAVED_PAYMENT_METHOD_ID=${JSON.stringify(savedPaymentMethodId)};
    var SAVED_ISSUER_ID=${JSON.stringify(savedIssuerId)};
    var mp=null;
    var fields={cardNumber:null,expirationDate:null,securityCode:null};
    var state={paymentMethodId:SAVED_PAYMENT_METHOD_ID,issuerId:SAVED_ISSUER_ID,installments:[]};

    function post(type,payload){
      window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({type:type,nonce:NONCE,mode:MODE},payload||{})));
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
      state.installments=payer.map(function(item){return item.installments;});
    }

    async function resolveCardMetadata(bin){
      try{
        if(MODE==='saved_card_payment'){
          return;
        }

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

        if(MODE==='saved_card_payment'){
          fields.securityCode=mp.fields.create('securityCode',{placeholder:'CVV'}).mount('form-checkout__securityCode');
        } else {
          fields.cardNumber=mp.fields.create('cardNumber',{placeholder:'0000 0000 0000 0000'}).mount('form-checkout__cardNumber');
          fields.expirationDate=mp.fields.create('expirationDate',{placeholder:'MM/AA'}).mount('form-checkout__expirationDate');
          fields.securityCode=mp.fields.create('securityCode',{placeholder:'CVV'}).mount('form-checkout__securityCode');

          if(fields.cardNumber&&typeof fields.cardNumber.on==='function'){
            fields.cardNumber.on('binChange',function(data){
              resolveCardMetadata(data&&data.bin?String(data.bin):'');
            });
          }
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
        var message=JSON.parse(ev.data||'{}');
        if(message.type!=='MP_SUBMIT'||message.nonce!==NONCE) return;

        if(!mp||!mp.fields||typeof mp.fields.createCardToken!=='function'){
          postDeviceSession();
          post('MP_CARD_TOKEN',{ok:false,errorCode:'MP_FIELDS_NOT_READY'});
          return;
        }

        postDeviceSession();

        var token;
        if(MODE==='saved_card_payment'){
          if(!SAVED_CARD_ID){
            post('MP_CARD_TOKEN',{ok:false,errorCode:'SAVED_CARD_NOT_SELECTED'});
            return;
          }

          token=await mp.fields.createCardToken({cardId:SAVED_CARD_ID});
        } else {
          token=await mp.fields.createCardToken({
            cardholderName:message.cardholderName,
            identificationType:message.docType,
            identificationNumber:message.docNumber
          });
        }

        postDeviceSession();

        post('MP_CARD_TOKEN',{
          ok:true,
          token:token&&token.id?token.id:null,
          paymentMethodId:state.paymentMethodId,
          issuerId:state.issuerId,
          installments:state.installments
        });
      } catch(e){
        postDeviceSession();
        post('MP_CARD_TOKEN',{ok:false,errorCode:'TOKENIZE_FAIL'});
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

function isForbiddenError(error: any) {
  return Number(error?.response?.status) === 403;
}

export function MercadoPagoCardEntryScreen({ navigation, route }: any) {
  const orderId = String(route?.params?.orderId || "");
  const routePublicKey = route?.params?.publicKey;
  const routeAmount = toAmountNumber(route?.params?.amount);

  const nonce = useMemo(() => makeNonce(), []);
  const webRef = useRef<WebView>(null);
  const tokenResultRef = useRef<TokenResultMessage | null>(null);

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

  const [entryMode, setEntryMode] = useState<EntryMode>("new_card_payment");
  const [savedCardsFeatureEnabled, setSavedCardsFeatureEnabled] = useState(false);
  const [savedCardsLoading, setSavedCardsLoading] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedPaymentCard[]>([]);
  const [selectedSavedCardId, setSelectedSavedCardId] = useState<string | null>(null);

  const orderDetailsRoute = String(route?.name).includes("Owner")
    ? OWNER_SCREENS.OrderDetails
    : CUSTOMER_SCREENS.OrderDetails;

  const selectedSavedCard =
    savedCards.find((card) => card.id === selectedSavedCardId) || null;

  const formattedAmount =
    amount > 0
      ? amount.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "";

  const html = useMemo(() => {
    if (!publicKey || amount <= 0) {
      return "";
    }

    return buildHtml({
      publicKey,
      amount,
      nonce,
      mode: entryMode,
      savedCard: selectedSavedCard,
    });
  }, [amount, entryMode, nonce, publicKey, selectedSavedCard]);

  const canPay =
    Boolean(publicKey) &&
    amount > 0 &&
    fieldsMounted &&
    ready &&
    provider === "MERCADOPAGO" &&
    !processing &&
    !paymentAttemptLocked &&
    (entryMode !== "saved_card_payment" || Boolean(selectedSavedCard));

  const goToOrderDetails = () =>
    navigation.replace(orderDetailsRoute, {
      orderId,
      showPaymentSuccessOnPaid: true,
    });

  const clearWebState = () => {
    tokenResultRef.current = null;
    setWebLoaded(false);
    setReady(false);
    setFieldsMounted(false);
    setDeviceSessionId(undefined);
    setPmId(undefined);
    setIssuerId(undefined);
    setInstallmentsExpanded(false);
  };

  const resetFeedback = () => {
    setError(null);
    setStatus(null);
    setStatusTitle(null);
    setShowOrderAction(false);
  };

  const disableSavedCards = React.useCallback(
    (message?: string) => {
      setSavedCardsFeatureEnabled(false);
      setSavedCards([]);
      setSelectedSavedCardId(null);
      setSavedCardsLoading(false);
      if (entryMode !== "new_card_payment") {
        setEntryMode("new_card_payment");
      }
      if (message) {
        setError(message);
      }
    },
    [entryMode]
  );

  const loadSavedCards = React.useCallback(
    async (options?: { keepCurrentMode?: boolean }) => {
      setSavedCardsLoading(true);

      try {
        const cards = await PaymentsService.listSavedCards();
        setSavedCardsFeatureEnabled(true);
        setSavedCards(cards);

        const defaultCard = cards.find((card) => card.isDefault) || cards[0] || null;
        setSelectedSavedCardId((current) => {
          if (current && cards.some((card) => card.id === current)) {
            return current;
          }
          return defaultCard?.id || null;
        });

        if (
          !options?.keepCurrentMode &&
          entryMode === "saved_card_payment" &&
          !cards.length
        ) {
          setEntryMode("new_card_payment");
        }
      } catch (listError: any) {
        if (isForbiddenError(listError)) {
          disableSavedCards();
        } else {
          setSavedCardsFeatureEnabled(false);
          setSavedCards([]);
          setSelectedSavedCardId(null);
        }
      } finally {
        setSavedCardsLoading(false);
      }
    },
    [disableSavedCards, entryMode]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      const methods = await PaymentsService.getPaymentMethods();
      if (!alive) return;

      const cardProvider = String(methods?.card?.provider || "").trim().toUpperCase();
      setProvider(cardProvider);

      if (cardProvider !== "MERCADOPAGO" || !methods?.card?.publicKey) {
        throw new Error("Mercado Pago indisponivel.");
      }

      setPublicKey((current) => current || methods.card.publicKey || null);

      const nextMaxInstallments = Number(methods.card.maxInstallments || 1);
      setMaxInstallments(nextMaxInstallments);
      setAvailableInstallments((current) => current.length > 1 ? current : [1]);

      let backendAmount = 0;
      if (orderId) {
        const active = await PaymentsService.active(orderId);
        if (!alive) return;
        backendAmount = extractActiveAmount(active);
      }

      if (backendAmount > 0) {
        setAmount(backendAmount);
      } else if (!(routeAmount > 0)) {
        setError("Nao foi possivel identificar o valor do pedido. Volte e tente novamente.");
      }

      try {
        await loadSavedCards();
      } catch {
        return;
      }
    })().catch(() => {
      if (alive) {
        setError("Nao foi possivel iniciar pagamento.");
      }
    });

    return () => {
      alive = false;
    };
  }, [loadSavedCards, orderId, routeAmount]);

  useEffect(() => {
    clearWebState();

    if (entryMode === "saved_card_payment") {
      const nextOptions = buildInstallmentOptions(maxInstallments);
      setAvailableInstallments(nextOptions);
      setInstallments((current) => (nextOptions.includes(current) ? current : nextOptions[0]));
    } else {
      setInstallments((current) => (current < 1 ? 1 : current));
    }
  }, [entryMode, maxInstallments, selectedSavedCardId]);

  useEffect(() => {
    if (!fieldsMounted && webLoaded && Boolean(publicKey) && amount > 0 && provider === "MERCADOPAGO") {
      const timer = setTimeout(() => {
        setError((prev) => prev || "Nao foi possivel carregar o formulario seguro do cartao. Tente novamente.");
      }, 5000);

      return () => clearTimeout(timer);
    }

    return;
  }, [amount, fieldsMounted, provider, publicKey, webLoaded]);

  const onUseAnotherCard = () => {
    resetFeedback();
    setEntryMode("new_card_payment");
  };

  const onAddSavedCard = () => {
    resetFeedback();
    setEntryMode("add_saved_card");
  };

  const onUseSavedCard = (card: SavedPaymentCard) => {
    resetFeedback();
    setSelectedSavedCardId(card.id);
    setEntryMode("saved_card_payment");
  };

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

        const secureFieldsReady =
          entryMode === "saved_card_payment"
            ? hasSecurityIframe
            : hasCardIframe && hasExpirationIframe && hasSecurityIframe;

        if (secureFieldsReady) {
          setFieldsMounted(true);
        }
      }

      if (msg.type === "MP_ERROR") {
        setError("Falha no formulario seguro do cartao.");
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
        ).sort((a, b) => a - b);

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

      if (msg.type === "MP_CARD_TOKEN") {
        tokenResultRef.current = msg;
      }
    } catch {
      setError("Resposta invalida da tokenizacao.");
    }
  };

  async function requestCardToken(): Promise<SuccessfulTokenResultMessage> {
    tokenResultRef.current = null;

    const payload: Record<string, string> = {
      type: "MP_SUBMIT",
      nonce,
    };

    if (entryMode !== "saved_card_payment") {
      const cardholderName = name.trim();
      const docDigits = onlyDigits(doc);

      const isCpf = docDigits.length === 11;
      const isCnpj = docDigits.length === 14;

      if (!cardholderName) {
        throw new Error("Informe o nome do titular do cartao.");
      }

      if (!isCpf && !isCnpj) {
        throw new Error("Informe um CPF ou CNPJ valido.");
      }

      payload.cardholderName = cardholderName;
      payload.docType = isCnpj ? "CNPJ" : "CPF";
      payload.docNumber = docDigits;
    }

    webRef.current?.postMessage(JSON.stringify(payload));

    const start = Date.now();
    while (!tokenResultRef.current) {
      if (Date.now() - start > 20000) {
        throw new Error("Tempo esgotado ao tokenizar cartao.");
      }

      await new Promise<void>((resolve) => setTimeout(resolve, 200));
    }

    const result = tokenResultRef.current as TokenResultMessage | null;
    tokenResultRef.current = null;

    if (!result) {
      throw new Error("Nao foi possivel tokenizar o cartao. Verifique os dados e tente novamente.");
    }

    if (result.ok !== true || typeof result.token !== "string" || !result.token) {
      throw new Error("Nao foi possivel tokenizar o cartao. Verifique os dados e tente novamente.");
    }

    const token = result.token;

    return {
      ...result,
      ok: true,
      token,
    };
  }

  async function waitPaymentStatus() {
    for (let i = 0; i < 20; i++) {
      await new Promise<void>((resolve) => setTimeout(resolve, 3000));

      const active = await PaymentsService.active(orderId);
      const payment = (active as any)?.payment || {};
      const nextAction = (active as any)?.nextAction || {};
      const ui = (active as any)?.ui || {};
      const flags = (active as any)?.flags || {};
      const paymentStatus = String(payment?.status || "").toUpperCase();

      if (paymentStatus === "PAID") {
        goToOrderDetails();
        return;
      }

      if (["FAILED", "CANCELED", "REJECTED", "DECLINED"].includes(paymentStatus)) {
        setStatusTitle("Pagamento recusado");
        setStatus(ui?.message || "Pagamento recusado. Tente outro cartao ou outra forma de pagamento.");

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
        paymentStatus === "PENDING" &&
        String(nextAction?.statusDetail || "").toLowerCase() === "pending_review_manual"
      ) {
        setStatusTitle("Pagamento em analise");
        setStatus(
          ui?.message ||
            "Pagamento em analise. O Mercado Pago recebeu sua tentativa e esta analisando a transacao."
        );
        setPaymentAttemptLocked(true);
        setShowOrderAction(true);
        return;
      }
    }

    setStatusTitle("Pagamento em analise");
    setStatus("Pagamento em analise. Voce pode acompanhar o status nos detalhes do pedido.");
    setPaymentAttemptLocked(true);
    setShowOrderAction(true);
  }

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
        throw new Error("Pedido invalido.");
      }

      if (!(amount > 0)) {
        throw new Error("Nao foi possivel carregar o valor do pedido.");
      }

      if (entryMode === "saved_card_payment") {
        const activeSavedCard = selectedSavedCard;
        if (!activeSavedCard) {
          throw new Error("Selecione um cartao salvo.");
        }

        const tokenResult = await requestCardToken();

        await PaymentsService.intentCARD(orderId, {
          installments,
          card: {
            savedCardId: activeSavedCard.id,
            cardToken: tokenResult.token || undefined,
            paymentMethodId: activeSavedCard.paymentMethodId,
            issuerId: activeSavedCard.issuerId || undefined,
            deviceSessionId,
          },
        });

        await waitPaymentStatus();
        return;
      }

      const cardholderName = name.trim();
      const emailValue = email.trim().toLowerCase();
      const docDigits = onlyDigits(doc);

      const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

      if (!isEmailValid) {
        throw new Error("Informe um email valido.");
      }

      const tokenResult = await requestCardToken();
      const paymentMethodId = tokenResult.paymentMethodId || pmId;

      if (!paymentMethodId) {
        throw new Error("Metodo de pagamento do cartao nao identificado.");
      }

      const nameParts = cardholderName.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || cardholderName;
      const lastName = nameParts.slice(1).join(" ") || firstName || "-";
      const docType = docDigits.length === 14 ? "CNPJ" : "CPF";

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
          cardToken: tokenResult.token || undefined,
          paymentMethodId,
          issuerId: tokenResult.issuerId || issuerId,
          deviceSessionId,
        },
      });

      await waitPaymentStatus();
    } catch (payError: any) {
      if (entryMode === "saved_card_payment" && isForbiddenError(payError)) {
        setStatusTitle("Cartao salvo indisponivel");
        setStatus(null);
        disableSavedCards("Cartoes salvos indisponiveis no momento. Use outro cartao.");
      } else {
        setStatusTitle("Erro no pagamento");
        setStatus(null);
        setError(payError?.message || "Erro ao pagar com Mercado Pago.");
      }
    } finally {
      tokenResultRef.current = null;
      setProcessing(false);
    }
  }

  async function onSaveCard() {
    if (!fieldsMounted || processing) return;

    setProcessing(true);
    setError(null);
    setStatusTitle("Salvando cartao...");
    setStatus("Salvando cartao...");
    setShowOrderAction(false);

    try {
      const tokenResult = await requestCardToken();
      const paymentMethodId = tokenResult.paymentMethodId || pmId;

      if (!paymentMethodId) {
        throw new Error("Metodo de pagamento do cartao nao identificado.");
      }

      const createdCard = await PaymentsService.createSavedCard({
        cardToken: tokenResult.token || "",
        paymentMethodId,
        issuerId: tokenResult.issuerId || issuerId,
      });

      await loadSavedCards({ keepCurrentMode: true });

      setSavedCardsFeatureEnabled(true);
      setSelectedSavedCardId(createdCard.id);
      setEntryMode("saved_card_payment");
      setStatusTitle("Cartao salvo");
      setStatus("Cartao salvo com sucesso.");
    } catch (saveError: any) {
      if (isForbiddenError(saveError)) {
        setStatusTitle("Cartoes salvos indisponiveis");
        setStatus(null);
        disableSavedCards("Salvar cartao indisponivel no momento. Use o cartao normalmente.");
      } else {
        setStatusTitle("Erro ao salvar cartao");
        setStatus(null);
        setError(saveError?.message || "Nao foi possivel salvar o cartao.");
      }
    } finally {
      tokenResultRef.current = null;
      setProcessing(false);
    }
  }

  const onPrimaryAction = () => {
    if (entryMode === "add_saved_card") {
      onSaveCard();
      return;
    }

    onPay();
  };

  const primaryLabel =
    entryMode === "add_saved_card"
      ? processing
        ? "Salvando..."
        : "Salvar cartao"
      : processing
      ? "Processando..."
      : `Pagar ${formattedAmount ? `R$ ${formattedAmount}` : ""}`;

  const webviewHeight = entryMode === "saved_card_payment" ? 110 : 220;

  return (
    <Screen>
      <SafeAreaView style={s.safeArea}>
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backIcon}>{"<"}</Text>
          </Pressable>
          <Text style={s.headerTitle}>Pagamento</Text>
          <View style={s.spacer} />
        </View>

        <KeyboardAvoidingView
          style={s.flex}
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

            {savedCardsLoading ? (
              <View style={s.savedCardsLoading}>
                <ActivityIndicator color="#111" />
                <Text style={s.savedCardsLoadingText}>Carregando cartoes salvos...</Text>
              </View>
            ) : null}

            {savedCardsFeatureEnabled ? (
              <View style={s.savedCardsSection}>
                <Text style={s.sectionTitle}>Cartoes salvos</Text>

                {savedCards.length ? (
                  savedCards.map((card) => {
                    const selected = selectedSavedCardId === card.id;
                    return (
                      <View
                        key={card.id}
                        style={[s.savedCardItem, selected && s.savedCardItemSelected]}
                      >
                        <View style={s.savedCardInfo}>
                          <Text style={s.savedCardTitle}>{getCardLabel(card)}</Text>
                          <Text style={s.savedCardMeta}>
                            {card.isDefault ? "Padrao" : "Salvo"}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => onUseSavedCard(card)}
                          style={[s.savedCardButton, selected && s.savedCardButtonActive]}
                        >
                          <Text
                            style={[
                              s.savedCardButtonText,
                              selected && s.savedCardButtonTextActive,
                            ]}
                          >
                            {selected && entryMode === "saved_card_payment"
                              ? "Selecionado"
                              : "Usar este cartao"}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })
                ) : (
                  <Text style={s.emptySavedCardsText}>
                    Nenhum cartao salvo disponivel.
                  </Text>
                )}

                <View style={s.savedCardActions}>
                  <Pressable onPress={onUseAnotherCard} style={s.secondaryInlineBtn}>
                    <Text style={s.secondaryInlineBtnText}>Usar outro cartao</Text>
                  </Pressable>

                  <Pressable onPress={onAddSavedCard} style={s.secondaryInlineBtn}>
                    <Text style={s.secondaryInlineBtnText}>Adicionar cartao salvo</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {entryMode !== "saved_card_payment" ? (
              <>
                <Text style={s.sectionTitle}>Dados do Titular</Text>

                <View style={s.fieldGroup}>
                  <Text style={s.label}>Nome do titular</Text>
                  <TextInput
                    placeholder="Ex: Joao Silva"
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
                    placeholder="Somente numeros"
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
              </>
            ) : selectedSavedCard ? (
              <View style={s.selectedCardSummary}>
                <Text style={s.sectionTitle}>Cartao selecionado</Text>
                <Text style={s.selectedCardSummaryText}>{getCardLabel(selectedSavedCard)}</Text>
                <Text style={s.selectedCardHint}>
                  Informe apenas o CVV no campo seguro abaixo.
                </Text>
              </View>
            ) : null}

            <View style={s.divider} />

            <Text style={s.sectionTitle}>
              {entryMode === "add_saved_card" ? "Adicionar cartao salvo" : "Dados do Cartao"}
            </Text>

            <View style={s.fieldGroup}>
              <Text style={s.label}>Parcelamento</Text>
              <Pressable
                style={s.dropdownBtn}
                onPress={() => setInstallmentsExpanded((current) => !current)}
              >
                <Text style={s.dropdownText}>{installments}x</Text>
                <Text style={s.dropdownIcon}>{installmentsExpanded ? "^" : "v"}</Text>
              </Pressable>

              {installmentsExpanded ? (
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
                      <Text
                        style={[
                          s.dropdownItemText,
                          installments === n && s.dropdownItemTextActive,
                        ]}
                      >
                        {n}x
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
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
                style={[s.webview, { height: webviewHeight, minHeight: webviewHeight }]}
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
              <Text style={s.securityNoticeText}>
                Pagamento 100% seguro via Mercado Pago
              </Text>
            </View>

            <Pressable
              onPress={onPrimaryAction}
              disabled={!canPay}
              style={[s.btn, !canPay && s.btnDisabled]}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>{primaryLabel}</Text>
              )}
            </Pressable>

            {entryMode === "add_saved_card" ? (
              <Pressable onPress={onUseAnotherCard} style={s.secondaryBtn}>
                <Text style={s.secondaryBtnText}>Voltar para pagamento</Text>
              </Pressable>
            ) : null}

            {showOrderAction ? (
              <Pressable onPress={goToOrderDetails} style={s.secondaryBtn}>
                <Text style={s.secondaryBtnText}>Ver pedido</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
    fontSize: 28,
    color: "#111",
    lineHeight: 28,
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
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
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
  savedCardsSection: {
    gap: 12,
  },
  savedCardsLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  savedCardsLoadingText: {
    color: "#444",
    fontSize: 14,
  },
  savedCardItem: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  savedCardItemSelected: {
    borderColor: "#111",
    backgroundColor: "#f8fafc",
  },
  savedCardInfo: {
    gap: 4,
  },
  savedCardTitle: {
    color: "#111",
    fontSize: 15,
    fontWeight: "700",
  },
  savedCardMeta: {
    color: "#666",
    fontSize: 13,
  },
  savedCardButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  savedCardButtonActive: {
    backgroundColor: "#111",
  },
  savedCardButtonText: {
    color: "#111",
    fontWeight: "700",
  },
  savedCardButtonTextActive: {
    color: "#fff",
  },
  savedCardActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  secondaryInlineBtn: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryInlineBtnText: {
    color: "#111",
    fontWeight: "600",
  },
  emptySavedCardsText: {
    color: "#555",
    fontSize: 14,
  },
  selectedCardSummary: {
    gap: 6,
  },
  selectedCardSummaryText: {
    color: "#111",
    fontSize: 15,
    fontWeight: "700",
  },
  selectedCardHint: {
    color: "#555",
    fontSize: 13,
  },
});
