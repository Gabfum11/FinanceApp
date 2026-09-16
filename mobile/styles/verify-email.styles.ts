import { StyleSheet } from "react-native";

export const styles=StyleSheet.create({
    container: {
        flex:1, //dice di occupare tutto lo spazio disponibile
        alignItems:"center",
        paddingTop:100
    },
    iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#E8F8F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  erroriconContainer:{
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#FDEAEA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    opacity: 0.6,
    marginBottom: 24,
  },
  codeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  codeBox: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  codeBoxActive: {
    borderColor: "#2ECC71",
    borderWidth: 2,
  },
  codeDigit: {
    fontSize: 22,
    fontWeight: "700",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    top:0,
    right:0,
    bottom:0,
    left: 0
  },
  button: {
    width: "100%",
    marginTop: 8,
  },
  resendCodeText:{
    color: "#2ECC71",
    fontWeight:"bold"
  },
  remainingTime:{
    opacity: 0.6
  },
})