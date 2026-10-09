import { StyleSheet } from "react-native";
import { type Colori, fontSize, fontWeight } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
  container: {
    flex:1,
  },
  //contenuto di PaginaScorrevole: il margine in alto lo calcola lei dalla barra di stato
  content: {
    padding:24,
    paddingBottom:48,
  },
  logoContainer: {
    alignItems:"center",
    marginBottom:100,
  },
  logo:{
    width:70,
    height:70,
    borderRadius:16,
  },
  logoLabel:{
    fontWeight: fontWeight.bold, //spessore/grassetto del testo
    fontSize: fontSize.xl,
    marginTop:10,
  },
  title: {
    marginBottom: 24,
    textAlign: "center",
    fontWeight: fontWeight.bold,
    fontSize: fontSize.xxxl
  },
  input: {
    marginBottom: 16,
  },
  inputOutline:{
    borderRadius:14
  },
  checkboxRow:{
    flexDirection:"row",
    alignItems:"center",
  },
  button: {
    marginTop: 8,
  },
  buttonLabel:{
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold
  },
  link:{
    marginTop: 16,
    textAlign:"center",
    fontSize: fontSize.base
    
  },
  legal: {
    marginTop: 16,
    textAlign: "center",
    fontSize: fontSize.sm,
    lineHeight: 18,
    color: colors.textMuted,
  },
  legalLink: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
  linkAction:{
    color: colors.primary,
    fontWeight: fontWeight.bold
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 12,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
  },
});
