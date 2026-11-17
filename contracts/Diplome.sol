
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Diplome {

    address public owner;

    struct DiplomeInfo {
        bytes32 hashPdf;
        string nomEtudiant;
        string filiere;
        uint256 annee;
        string cid;
        uint256 dateEmission;
        bool valide;
        bool existe;
    }

    mapping(bytes32 => DiplomeInfo) public diplomes;

    event DiplomeEmis(
        bytes32 indexed hashPdf,
        string nomEtudiant,
        string cid
    );

    event DiplomeRevoque(bytes32 indexed hashPdf);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Acces reserve a l'universite");
        _;
    }

    function emettreDiplome(
        bytes32 hashPdf,
        string memory nomEtudiant,
        string memory filiere,
        uint256 annee,
        string memory cid
    ) public onlyOwner {

        require(hashPdf != bytes32(0), "Hash invalide");
        require(!diplomes[hashPdf].existe, "Diplome deja emis");

        diplomes[hashPdf] = DiplomeInfo({
            hashPdf: hashPdf,
            nomEtudiant: nomEtudiant,
            filiere: filiere,
            annee: annee,
            cid: cid,
            dateEmission: block.timestamp,
            valide: true,
            existe: true
        });

        emit DiplomeEmis(hashPdf, nomEtudiant, cid);
    }

    function verifierDiplome(bytes32 hashPdf)
        public
        view
        returns (
            bool trouve,
            string memory nomEtudiant,
            string memory filiere,
            uint256 annee,
            string memory cid,
            uint256 dateEmission,
            bool valide
        )
    {
        DiplomeInfo memory d = diplomes[hashPdf];

        return (
            d.existe,
            d.nomEtudiant,
            d.filiere,
            d.annee,
            d.cid,
            d.dateEmission,
            d.valide
        );
    }

    function revoquerDiplome(bytes32 hashPdf) public onlyOwner {
        require(diplomes[hashPdf].existe, "Diplome introuvable");
        require(diplomes[hashPdf].valide, "Diplome deja revoque");

        diplomes[hashPdf].valide = false;

        emit DiplomeRevoque(hashPdf);
    }
}
