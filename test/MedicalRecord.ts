import { expect } from "chai";
import { network } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";

const { ethers } = await network.create();

describe("MedicalRecord", function () {
  const patientId = "PAT-001";
  const hash1 = ethers.keccak256(ethers.toUtf8Bytes("dossier version 1"));
  const hash2 = ethers.keccak256(ethers.toUtf8Bytes("dossier version 2"));

  describe("Enregistrement d'un hash", function () {
    it("devrait enregistrer un hash et incrémenter le nombre de versions", async function () {
      const contract = await ethers.deployContract("MedicalRecord");

      await contract.registerRecord(patientId, hash1);

      expect(await contract.getVersionCount(patientId)).to.equal(1n);
    });

    it("devrait émettre l'événement RecordRegistered avec les bons arguments", async function () {
      const contract = await ethers.deployContract("MedicalRecord");

      await expect(contract.registerRecord(patientId, hash1))
        .to.emit(contract, "RecordRegistered")
        .withArgs(patientId, hash1, anyValue, 1n);
    });

    it("devrait rejeter un patientId vide", async function () {
      const contract = await ethers.deployContract("MedicalRecord");

      await expect(
        contract.registerRecord("", hash1)
      ).to.be.revertedWith("MedicalRecord: patientId vide");
    });

    it("devrait rejeter un hash nul", async function () {
      const contract = await ethers.deployContract("MedicalRecord");

      await expect(
        contract.registerRecord(patientId, ethers.ZeroHash)
      ).to.be.revertedWith("MedicalRecord: hash invalide");
    });
  });

  describe("Récupération du dernier hash", function () {
    it("devrait retourner le dernier hash enregistré", async function () {
      const contract = await ethers.deployContract("MedicalRecord");

      await contract.registerRecord(patientId, hash1);
      await contract.registerRecord(patientId, hash2);

      const [recordHash] = await contract.getLatestRecord(patientId);
      expect(recordHash).to.equal(hash2);
    });

    it("devrait échouer pour un patient sans dossier", async function () {
      const contract = await ethers.deployContract("MedicalRecord");

      await expect(
        contract.getLatestRecord("INCONNU")
      ).to.be.revertedWith("MedicalRecord: aucun dossier pour ce patient");
    });
  });

  describe("Vérification d'intégrité", function () {
    it("devrait retourner true pour un hash correct", async function () {
      const contract = await ethers.deployContract("MedicalRecord");
      await contract.registerRecord(patientId, hash1);

      expect(await contract.verifyIntegrity(patientId, hash1)).to.equal(true);
    });

    it("devrait retourner false pour un hash incorrect (dossier modifié)", async function () {
      const contract = await ethers.deployContract("MedicalRecord");
      await contract.registerRecord(patientId, hash1);

      expect(await contract.verifyIntegrity(patientId, hash2)).to.equal(false);
    });

    it("devrait échouer pour un patient sans dossier", async function () {
      const contract = await ethers.deployContract("MedicalRecord");

      await expect(
        contract.verifyIntegrity("INCONNU", hash1)
      ).to.be.revertedWith("MedicalRecord: aucun dossier pour ce patient");
    });
  });

  describe("Gestion de plusieurs versions", function () {
    it("devrait conserver l'historique complet des versions", async function () {
      const contract = await ethers.deployContract("MedicalRecord");

      await contract.registerRecord(patientId, hash1);
      await contract.registerRecord(patientId, hash2);

      expect(await contract.getVersionCount(patientId)).to.equal(2n);

      const [firstHash] = await contract.getRecordAt(patientId, 0);
      const [secondHash] = await contract.getRecordAt(patientId, 1);

      expect(firstHash).to.equal(hash1);
      expect(secondHash).to.equal(hash2);
    });

    it("devrait incrémenter le numéro de version à chaque enregistrement", async function () {
      const contract = await ethers.deployContract("MedicalRecord");

      await expect(contract.registerRecord(patientId, hash1))
        .to.emit(contract, "RecordRegistered")
        .withArgs(patientId, hash1, anyValue, 1n);

      await expect(contract.registerRecord(patientId, hash2))
        .to.emit(contract, "RecordRegistered")
        .withArgs(patientId, hash2, anyValue, 2n);
    });
  });
});