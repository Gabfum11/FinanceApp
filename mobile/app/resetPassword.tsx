import {View} from "react-native"
import {Text,TextInput,Button, IconButton,Snackbar } from "react-native-paper"
import {useEffect, useState } from "react"
import { API_URL } from "@/config";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { creaStili } from "@/styles/reset-password.styles";
import { messaggioErrore } from "@/utils/messaggioErrore";
import { useTranslation } from "react-i18next";
import { useStili, useTema } from "@/utils/tema";
import { PaginaDivisa } from "@/components/PaginaDivisa";
const num=[0,1,2,3,4,5]
const formatTime =(totseconds:number)=>{
    const minutes=Math.floor(totseconds/60);
    const seconds=totseconds%60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
export default function ResetPassword(){
  const styles = useStili(creaStili);
  const { colors } = useTema();
   const { t } = useTranslation();
   const [email,setEmail]=useState("");
   const [step, setStep]=useState<"email" | "typing" | "invalid" | "correct" | "saved">("email");
   const [code,setCode]=useState("")
   const [secondsleft,setSecondsLeft]=useState(0);
   const [new_password,setnew_password]=useState("");
   const[Passtoken,setPassToken]=useState("")
   const [loading, setLoading] = useState(false);
   const [errorMessage, setErrorMessage] = useState("");
   const [snackbarVisible, setSnackbarVisible] = useState(false);  
   const[showPassword, setShowPassword]=useState(false);

    useEffect(()=>{
        if (secondsleft===0) return;
        const intervalID=setInterval(()=>{
            setSecondsLeft((prev)=>prev-1)
        },1000); //eseguita ogni secondo, serve clearInterval per fermarla
        return ()=>clearInterval(intervalID);
    },
    [secondsleft] //use effect si riesegue ogni volta che secondsleft cambia
    )
   function handleCodeChange(text: string) {
        const cleaned = text.replace(/[^0-9]/g, "").slice(0, 6);
        setCode(cleaned);
    }
    async function handleVerify() {
      try{
        setLoading(true)
         const response= await fetch(`${API_URL}/auth/verify-otp`,{
                method:"POST",
                headers:{"Content-Type": "application/json"},
                body:JSON.stringify({email,code, purpose:"password_reset"})
            })
            if(!response.ok)
            {
               setErrorMessage(await messaggioErrore(response, t("codice.nonValido")))
               console.log("Codice errato");
               setSnackbarVisible(true)
               setStep("invalid")
               return;
            }
            const data= await response.json();
            setPassToken(data.access_token);
            setStep("correct")

      }catch(error){
         console.log("errore di rete", error)
      }finally{
        setLoading(false)
      }
    }
    async function handleResendCode() {
        try{
            setLoading(true)
            const response = await fetch(`${API_URL}/auth/resendOTP`, {
                method:"POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({email, purpose:"password_reset"})
            })
            if(!response.ok) {
                setErrorMessage(await messaggioErrore(response, t("codice.erroreInvio")))
                setSnackbarVisible(true)
                console.log("errore nell'invio del nuovo codice")
                return;
            }
            console.log("nuovo codice inviato")
            setSecondsLeft(60);
            setCode("");

        }catch(error){
             console.log("errore di rete", error)
        } finally{
            setLoading(false)
        }

    }
   async function handleSendCode() {
       try{
          setLoading(true)
          const response = await fetch(`${API_URL}/auth/resendOTP`,{
              method:"POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({email, purpose:"password_reset"})
          })
          if(!response.ok) {
            setErrorMessage(await messaggioErrore(response, t("codice.erroreInvio")))
            setSnackbarVisible(true)
                 console.log("errore nell'invio del nuovo codice")
                 return;
             }
             setStep("typing");
 
       }catch(error){
           console.log("errore di rete", error)
       }finally{
        setLoading(false)
       }
   }
   async function handleSavePassword() {
        if (new_password.length < 8) {
            setErrorMessage(t("reset.troppoCorta"))
            setSnackbarVisible(true)
            return;
        }
        try{
            setLoading(true)
            const response= await fetch(`${API_URL}/auth/resetPassword`, {
                method:"POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization" : `Bearer ${Passtoken}`

                },
                body: JSON.stringify({new_password, purpose:"password_reset"})
            })
            if(!response.ok) {
                setErrorMessage(await messaggioErrore(response, t("reset.erroreSalvataggio")))
                setSnackbarVisible(true)
                 console.log("errore nel salvataggio della password")
                 return;
            }
            setStep("saved")


        }catch(error)
        {
            console.log("errore di rete", error)
        }finally{
            setLoading(false)
        }
   }
   return(
      <PaginaDivisa>
      <View>
        <IconButton
            icon="chevron-left"
            iconColor={colors.text}
            size={28}
            onPress={()=>router.back()}
            />
         {step==="email" ? (
         <>
            <View style={styles.iconContainer}>
                 <MaterialCommunityIcons name="lock-outline" size={32} color="#F5A623"/>
            </View>
          <Text style={styles.title} variant="titleMedium">{t("reset.titolo")}</Text>
          <Text style={styles.subtitle} variant="bodyMedium">{t("reset.spiegazione")}</Text>
          <TextInput
             label={t("comune.email")}
             value={email}
             onChangeText={setEmail}
             autoCapitalize="none"
             mode="outlined"
             outlineStyle={styles.inputOutline}
             keyboardType="email-address"
             style={styles.input}
          />
          <Button 
          onPress={handleSendCode}
          mode="contained"
          style={styles.button}
          labelStyle={styles.buttonLabel}
          loading={loading}
          disabled={loading}
          >{t("reset.inviaCodice")}</Button>
      </>
      ): step==="typing" ? (
      <>
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="email-outline" size={32} color="#2ECC71"/>
            </View>
            <Text style={styles.title} variant="titleMedium">{t("codice.controllaPosta")}</Text>
            <Text style={styles.subtitle} variant="bodyMedium">{t("codice.inviato", { email })}</Text>
            <View style={styles.codeRow}>
                {num.map((index)=>(
                    <View
                        key={index}
                        style={[styles.codeBox, index === code.length && styles.codeBoxActive]}
                    >
                        {/* se code[index] non esiste (l'utente non ha ancora digitato abbastanza cifre per riempire quella posizione), usa una stringa vuota invece di mostrare undefined */}
                            <Text style={styles.codeDigit}>{code[index] ?? ""}</Text>
                     </View>
                ))}
            </View>
            <TextInput
                value={code}
                onChangeText={handleCodeChange}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                style={styles.hiddenInput}
            />
            <Text>{t("codice.nonRicevuto")}</Text>
                {secondsleft>0  ?(
                    <Text style={styles.remainingTime}>{t("codice.riprovaTra", { tempo: formatTime(secondsleft) })}</Text>
                    ):(
                        <Text style={styles.resendCodeText} onPress={loading ? undefined :handleResendCode}>{loading ? t("codice.invioInCorso") : t("codice.inviaNuovo")}</Text>
                    )}
            <Button
                style={styles.button}
                    mode="contained"
                    loading={loading}
                    disabled={loading}
                    onPress={handleVerify}>
                {t("codice.verifica")}
            </Button>
      </>
      ):step=="invalid" ?(
         <>
            <View style={styles.erroriconContainer}>
                <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#E74C3C" />
            </View>
            <Text style={styles.title} variant="titleMedium">{t("codice.nonValido")}</Text>
            <Text style={styles.subtitle} variant="bodyMedium">{t("codice.controllaCifre")}</Text>
            <Button style={styles.button} onPress={()=>setStep("typing")}>{t("comune.riprova")}</Button>
        </>

      ): step=="correct" ?(
        <>
            <View>
                <Text style={styles.title} variant="titleMedium">{t("reset.nuova")}</Text>
                <Text style={styles.subtitle} variant="bodyMedium">{t("reset.minimo")}</Text>
                <TextInput
                    label={t("comune.password")}
                    value={new_password}
                    onChangeText={setnew_password}
                    secureTextEntry={!showPassword} //nasconde i caratteri(mostra pallini o asteriscghi)
                    mode="outlined"
                    outlineStyle={styles.inputOutline}
                    style={styles.input}
                    right={
                <TextInput.Icon 
                    icon={showPassword ? "eye-off" : "eye"} 
                    onPress={() => setShowPassword(!showPassword)} 
                />
                    }
                />
                <Button 
                    mode="contained" 
                    onPress={handleSavePassword} 
                    style={styles.button}
                    labelStyle={styles.buttonLabel}
                    loading={loading}
                    disabled={loading}
                >
                    {t("reset.salva")}
                </Button>
            </View>
        </>
      ): (
        <>
         <View>
            <View style={styles.successIconContainer}>
                <MaterialCommunityIcons name="check-bold" size={32} color="white"/>
            </View>
            <Text style={styles.title} variant="titleMedium">{t("reset.aggiornata")}</Text>
            <Text style={styles.subtitle} variant="bodyMedium">{t("reset.accediSubito")}</Text>
            <Button
                mode="contained"
                style={styles.button}
                onPress={()=>router.replace("/login")}
                labelStyle={styles.buttonLabel}
            >
                {t("reset.vaiAccesso")}
            </Button>
         </View>
        </>
      )}
      <Snackbar
    visible={snackbarVisible}
    onDismiss={() => setSnackbarVisible(false)}
    >
    {errorMessage}
</Snackbar>
   </View>
   </PaginaDivisa>
); 
}