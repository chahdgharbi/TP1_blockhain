// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MedicalRecord
/// @notice Enregistre l'empreinte cryptographique (hash) des dossiers médicaux
///         sur la blockchain afin d'en garantir l'intégrité, sans stocker les
///         données médicales elles-mêmes on-chain.
contract MedicalRecord {
    /// @dev Une version enregistrée du dossier d'un patient
    struct RecordVersion {
        bytes32 recordHash;   // empreinte cryptographique du dossier
        uint256 timestamp;    // date d'enregistrement (timestamp du bloc)
    }

    /// @dev patientId => liste des versions enregistrées (historique complet)
    mapping(string => RecordVersion[]) private records;

    /// @notice Émis à chaque nouvel enregistrement d'un hash
    /// @param patientId identifiant du patient
    /// @param recordHash empreinte enregistrée
    /// @param timestamp date d'enregistrement
    /// @param version numéro de la version (1 = première version)
    event RecordRegistered(
        string indexed patientId,
        bytes32 recordHash,
        uint256 timestamp,
        uint256 version
    );

    /// @notice Enregistre une nouvelle empreinte pour un patient donné
    /// @param patientId identifiant du patient
    /// @param recordHash hash du dossier médical (ex: keccak256 du contenu)
    function registerRecord(string calldata patientId, bytes32 recordHash) external {
        require(bytes(patientId).length > 0, "MedicalRecord: patientId vide");
        require(recordHash != bytes32(0), "MedicalRecord: hash invalide");

        records[patientId].push(RecordVersion({
            recordHash: recordHash,
            timestamp: block.timestamp
        }));

        emit RecordRegistered(
            patientId,
            recordHash,
            block.timestamp,
            records[patientId].length
        );
    }

    /// @notice Retourne le dernier hash enregistré pour un patient
    /// @param patientId identifiant du patient
    /// @return recordHash dernier hash enregistré
    /// @return timestamp date de cet enregistrement
    function getLatestRecord(string calldata patientId)
        external
        view
        returns (bytes32 recordHash, uint256 timestamp)
    {
        uint256 count = records[patientId].length;
        require(count > 0, "MedicalRecord: aucun dossier pour ce patient");

        RecordVersion storage latest = records[patientId][count - 1];
        return (latest.recordHash, latest.timestamp);
    }

    /// @notice Vérifie si un hash donné correspond au dernier hash enregistré
    /// @param patientId identifiant du patient
    /// @param hashToCheck hash à vérifier (recalculé à partir du dossier actuel)
    /// @return true si le dossier est intègre (hash identique), false sinon
    function verifyIntegrity(string calldata patientId, bytes32 hashToCheck)
        external
        view
        returns (bool)
    {
        uint256 count = records[patientId].length;
        require(count > 0, "MedicalRecord: aucun dossier pour ce patient");

        return records[patientId][count - 1].recordHash == hashToCheck;
    }

    /// @notice Retourne le nombre de versions enregistrées pour un patient
    /// @param patientId identifiant du patient
    function getVersionCount(string calldata patientId) external view returns (uint256) {
        return records[patientId].length;
    }

    /// @notice Retourne une version spécifique du dossier d'un patient (historique)
    /// @param patientId identifiant du patient
    /// @param versionIndex index de la version, 0 = première version enregistrée
    function getRecordAt(string calldata patientId, uint256 versionIndex)
        external
        view
        returns (bytes32 recordHash, uint256 timestamp)
    {
        require(versionIndex < records[patientId].length, "MedicalRecord: version inexistante");
        RecordVersion storage version = records[patientId][versionIndex];
        return (version.recordHash, version.timestamp);
    }
}
